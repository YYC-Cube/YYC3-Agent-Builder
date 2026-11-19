---
file: 006-PGDATA迁移至V3执行单.md
title: YYC³ PGDATA 迁移至 V3 NVMe 执行单
description: 将 PG15 主库数据目录从 V2 HDD RAID6 迁移到 V3 NVMe 的停机/在线两套方案、initdb 与逻辑迁移兜底、回滚与验收
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-11
updated: 2026-11-11
status: published
tags: [PG15, 迁移, NVMe, pg_basebackup, initdb, 运维]
category: guide
language: zh-CN
audience: ops, dba
complexity: advanced
---

# YYC³ PGDATA 迁移至 V3 NVMe 执行单

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 一、目标与定案

| 项 | 内容 |
| --- | --- |
| 主机 | yyc3-45（NAS，TerraMaster F4-423） |
| 源 | V2 `4×8T HDD RAID6` 上的 PG15 数据目录 |
| 目标 | **V3 `2×2T NVMe RAID1`**（当前约 9% 使用） |
| 端口 / 角色 | 5433，主库（备库在 yyc3-22 Mac） |
| 目标路径 | `$V3_MOUNT/pgdata/15/main`（**挂载点以 `df -h` 实测为准**，勿照抄示例） |
| 停机窗口 | 方案 A 约 10–40 分钟（取决于数据量）；方案 B 约 3–8 分钟 |
| 回滚 | 保留旧目录 ≥ 7 天，改回 `data_directory` 即回滚 |

> **前置决策已确认**：PGDATA 从 V2 迁到 V3 NVMe；主备方向为 NAS 主、Mac 备，双端 5433。

## 二、迁移前必读

1. **确认 V3 的真实挂载点与设备类型**（必须是 NVMe，不能是 HDD）：
   ```bash
   df -hT | grep -Ei 'nvme|volume|mnt'
   lsblk -o NAME,SIZE,ROTA,TYPE,MOUNTPOINT
   # ROTA=0 表示非旋转盘（SSD/NVMe）
   ```
2. **确认 PG 版本、配置路径、数据目录**：
   ```bash
   psql -p 5433 -U postgres -c "show server_version; show data_directory; show config_file; show hba_file;"
   sudo -u postgres pg_controldata "$PGDATA_OLD" | grep -E 'Database cluster state|Latest checkpoint'
   ```
3. **确认该集群承载哪些库**（GitBucket / 0379 是否共用）：
   ```bash
   psql -p 5433 -U postgres -c "\l"
   ```
   若共用，迁移期间 GitBucket 等也会中断，需提前通知。
4. **空间与权限**：
   ```bash
   du -sh "$PGDATA_OLD"
   df -h "$V3_MOUNT"
   # 新盘可用空间 ≥ 数据目录 × 1.3（含 WAL 余量）
   ```
5. **先做一份可恢复备份**（迁移前必须）：
   ```bash
   sudo -u postgres pg_dumpall -p 5433 -Fc -f /backup/pg15-before-migrate-$(date +%F).dump
   # 或 pg_basebackup 到 V2 备份区，见 §五
   ```
6. **确认复制状态**（备库 Mac 追平）：
   ```bash
   psql -h 100.65.172.88 -p 5433 -U postgres -c \
    "select client_addr, state, sync_state, replay_lag from pg_stat_replication;"
   ```

## 三、方案选择

| 方案 | 原理 | 停机 | 适用 | 推荐度 |
| --- | --- | --- | --- | --- |
| **A. 停机 rsync** | 停库后整目录复制 | 复制耗时（HDD 读 + NVMe 写） | 数据量 ≤ 数百 GB、可接受维护窗口 | ⭐⭐⭐⭐⭐ 首选 |
| **B. basebackup 预拷贝 + 短停机** | 在线 `pg_basebackup` 预热，窗口内 rsync 增量 | 3–8 分钟 | 数据量大、窗口短 | ⭐⭐⭐⭐ |
| **C. initdb + 逻辑迁移** | 新集群 `initdb`，`pg_dumpall`/`pg_restore` | dump+restore 全程 | 跨大版本、只迁部分库、需重建 | ⭐⭐ 兜底 |

> **不要**先 `initdb` 再 `pg_basebackup`：`pg_basebackup` 要求目标目录为空。`initdb` 只用于方案 C 或全新集群。

## 四、通用准备（三套方案都执行）

```bash
# 变量（按实际修改；V3 挂载点必须先用 df -h 确认）
export V3_MOUNT=/mnt/yyc3-v3          # 示例，务必替换
export PGDATA_OLD=/var/lib/postgresql/15/main
export PGDATA_NEW="$V3_MOUNT/pgdata/15/main"
export PGVER=15
export PGPORT=5433

# 目录与权限
sudo mkdir -p "$PGDATA_NEW"
sudo chown -R postgres:postgres "$(dirname "$PGDATA_NEW")"
sudo chmod 700 "$PGDATA_NEW"

# 记录基线（迁移后对比）
psql -p $PGPORT -U postgres -Atc "select datname from pg_database order by 1" > /tmp/db_list_before.txt
psql -p $PGPORT -U postgres -Atc "select extname from pg_extension order by 1" > /tmp/ext_before.txt
sudo -u postgres pg_dumpall -p $PGPORT --schema-only > /tmp/schema_before.sql
md5sum /tmp/schema_before.sql
```

## 五、方案 A：停机 rsync（推荐）

### 步骤 1：停应用写入

```bash
cd /opt/yyc3/deploy
docker compose -f docker-compose.prod.yml stop app

# 确认无业务连接（保留本会话）
psql -p $PGPORT -U postgres -c \
 "select pid, usename, datname, state from pg_stat_activity where pid <> pg_backend_pid();"
```

### 步骤 2：检查点并停库

```bash
psql -p $PGPORT -U postgres -c "checkpoint;"
sudo systemctl stop postgresql@$PGVER-main
sudo -u postgres pg_ctl status -D "$PGDATA_OLD" || echo "PG_STOPPED"
```

> 若为容器化 PG：`docker stop <pg_container>`，后续文件路径相应替换。

### 步骤 3：整目录复制（保留属主/ACL/硬链接/扩展属性）

```bash
sudo rsync -aHAX --numeric-ids --delete --info=progress2 \
  "$PGDATA_OLD"/ "$PGDATA_NEW"/

# 校验关键文件与权限
sudo ls -la "$PGDATA_NEW" | head
sudo -u postgres test -f "$PGDATA_NEW/PG_VERSION" && cat "$PGDATA_NEW/PG_VERSION"
sudo -u postgres pg_controldata "$PGDATA_NEW" | grep -E 'Database cluster state|Latest checkpoint'
```

> 无 rsync 时用 `sudo cp -a "$PGDATA_OLD"/. "$PGDATA_NEW"/`，但无法断点续传。

### 步骤 4：切换 data_directory

```bash
# Debian/Ubuntu 配置在 /etc/postgresql/15/main/postgresql.conf
sudo sed -i "s#^data_directory.*#data_directory = '$PGDATA_NEW'#" \
  /etc/postgresql/$PGVER/main/postgresql.conf

grep -n '^data_directory' /etc/postgresql/$PGVER/main/postgresql.conf
```

> 不要移动 `/etc/postgresql/...` 下的配置文件；只改 `data_directory`。若 NAS 的 PG 用单一 `postgresql.conf` 放在数据目录内，则连配置一起复制，并同步修改 `-D`/systemd 的 `PGDATA`。

### 步骤 5：启动并验证

```bash
sudo systemctl start postgresql@$PGVER-main
sleep 2
pg_isready -h 127.0.0.1 -p $PGPORT
sudo journalctl -u postgresql@$PGVER-main -n 50 --no-pager

psql -p $PGPORT -U postgres -c "select pg_is_in_recovery();"        # 期望 f
psql -p $PGPORT -U postgres -c "\l"
psql -p $PGPORT -U postgres -Atc "select datname from pg_database order by 1" | diff - /tmp/db_list_before.txt
psql -p $PGPORT -U postgres -Atc "select extname from pg_extension order by 1" | diff - /tmp/ext_before.txt
```

### 步骤 6：应用回归

```bash
cd /opt/yyc3/deploy
docker compose -f docker-compose.prod.yml up -d app
curl -fsS http://100.65.172.88:3000/api/health
# 执行一条 SSE 工作流，确认读写正常
```

### 步骤 7：保留旧目录用于回滚

```bash
sudo mv "$PGDATA_OLD" "${PGDATA_OLD}.old-$(date +%F)"
# 7 天后确认无异常再删除；删除前确认 V3 备份已完成
```

## 六、方案 B：`pg_basebackup` 预拷贝 + 短停机

> 适合数据量大、维护窗口短。最终以「停库后 rsync 增量」为准，保证零丢失。

### 步骤 1：在线预拷贝（业务可运行）

```bash
# 本地 socket（pg_hba 需 local replication 权限）
sudo -u postgres pg_basebackup \
  -h /var/run/postgresql -p $PGPORT -U repl \
  -D "$PGDATA_NEW" -X stream -c fast -P

# 或走 TCP（pg_hba 需 host replication repl 127.0.0.1/32 scram-sha-256）
# sudo -u postgres pg_basebackup -h 127.0.0.1 -p $PGPORT -U repl -D "$PGDATA_NEW" -X stream -c fast -P
```

完成后检查：

```bash
sudo -u postgres pg_controldata "$PGDATA_NEW" | grep -E 'Database cluster state|Latest checkpoint'
du -sh "$PGDATA_NEW"
```

### 步骤 2：窗口内停写、停库

```bash
docker compose -f /opt/yyc3/deploy/docker-compose.prod.yml stop app
psql -p $PGPORT -U postgres -c "checkpoint;"
sudo systemctl stop postgresql@$PGVER-main
```

### 步骤 3：增量同步（关键）

```bash
# 以停库后的旧目录为准，使新目录与其逐字节一致（--delete 会清掉 backup_label 等预拷贝残留）
sudo rsync -aHAX --numeric-ids --delete --info=progress2 \
  "$PGDATA_OLD"/ "$PGDATA_NEW"/
```

### 步骤 4：切换并启动

同方案 A 步骤 4–7。

> 说明：`pg_basebackup` 的作用是**预热大部分数据**，缩短窗口内 rsync 时间；真正的一致性由停库后的 rsync 保证。不要在预拷贝目录上直接启动作为主库（会丢失预拷贝结束后的写入）。

## 七、方案 C：`initdb` + 逻辑迁移（兜底）

> 仅用于跨大版本、只迁部分库、或物理复制反复失败。停机时间 = dump + restore。

### 1. 新建空集群（V3）

```bash
sudo -u postgres /usr/lib/postgresql/$PGVER/bin/initdb \
  -D "$PGDATA_NEW" \
  -E UTF8 --locale=C.UTF-8 \
  --auth-local=peer --auth-host=scram-sha-256
```

### 2. 导出（旧库）

```bash
sudo -u postgres pg_dumpall -p $PGPORT --globals-only -f /backup/globals.sql
sudo -u postgres pg_dump -p $PGPORT -Fc -d yyc3_agent -f /backup/yyc3_agent.dump
# 其他库逐个导出
```

### 3. 停旧、启新、恢复

```bash
sudo systemctl stop postgresql@$PGVER-main
# 修改 data_directory 指向 $PGDATA_NEW（同方案 A 步骤 4）
sudo systemctl start postgresql@$PGVER-main

psql -p $PGPORT -U postgres -f /backup/globals.sql
sudo -u postgres pg_restore -p $PGPORT -d yyc3_agent --no-owner --role=yyc3_app -j 4 /backup/yyc3_agent.dump
```

### 4. 重建统计与校验

```bash
psql -p $PGPORT -U postgres -c "vacuumdb --all --analyze" || \
  sudo -u postgres vacuumdb -p $PGPORT --all --analyze
```

> 逻辑迁移不保留统计信息、部分扩展配置与复制槽；需重建扩展（`create extension`）并重新创建复制槽。

## 八、启动后调优（V3 NVMe）

```conf
# postgresql.conf（主库，NAS 32GB）
shared_buffers = 8GB
effective_cache_size = 16GB
work_mem = 32MB
maintenance_work_mem = 1GB
random_page_cost = 1.1
effective_io_concurrency = 200
maintenance_io_concurrency = 200
checkpoint_timeout = 15min
max_wal_size = 8GB
min_wal_size = 2GB
wal_compression = on
synchronous_commit = remote_write
```

挂载建议：V3 挂载加 `noatime`；确认 `/etc/fstab` 持久化，避免重启后路径丢失导致 PG 起不来。

## 九、验证清单

- [ ] `pg_isready -p 5433` 返回 accepting connections
- [ ] `pg_is_in_recovery()` 为 `f`
- [ ] 数据库列表、扩展列表与迁移前一致
- [ ] 关键表行数与迁移前抽样一致（或 `pg_dump --schema-only` md5 一致）
- [ ] 序列当前值未回退
- [ ] 应用 `/api/health` 200，`rateLimitStore=redis`
- [ ] SSE 工作流执行成功（start → javascript → end）
- [ ] 备库 `pg_stat_replication` 为 `streaming`，`replay_lag < 1s`
- [ ] 备份任务仍指向新数据目录（`pg_basebackup`/WAL 归档脚本）
- [ ] 旧目录保留且回滚路径可用

## 十、回滚

```bash
# 1. 停应用与新库
docker compose -f /opt/yyc3/deploy/docker-compose.prod.yml stop app
sudo systemctl stop postgresql@$PGVER-main

# 2. 恢复 data_directory 指向旧目录
sudo sed -i "s#^data_directory.*#data_directory = '${PGDATA_OLD}.old-YYYY-MM-DD'#" \
  /etc/postgresql/$PGVER/main/postgresql.conf

# 3. 启动旧库并回归
sudo systemctl start postgresql@$PGVER-main
pg_isready -p $PGPORT
docker compose -f /opt/yyc3/deploy/docker-compose.prod.yml up -d app
```

**回滚触发条件**：启动失败且 10 分钟内无法定位；数据校验不一致；应用写入报错；备库复制中断无法恢复。

## 十一、备库与复制注意事项

- 主库数据目录迁移**不影响**备库的 `primary_conninfo`（仍连 `100.65.172.88:5433`），但迁移期间主库停机，备库会累积 WAL；迁移完成后确认追平。
- 若迁移中误提升了备库，**不要**直接启动旧主；先按 [005 手册](005-PG15主备切换与演练手册.md) 用 `pg_rewind` 回加入。
- 迁移后检查复制槽是否仍有效；若重建了集群（方案 C），需在新主重新创建 `yyc3_22` 槽并让备库重新 `pg_basebackup`。
- 迁移完成后更新备份脚本中的 `PGDATA` 路径与 `pg_basebackup` 目标。

## 十二、时间预估

| 数据量 | 方案 A（HDD 读 → NVMe 写） | 方案 B 窗口 |
| --- | --- | --- |
| 10 GB | 约 2–5 分钟 | 约 2–3 分钟 |
| 100 GB | 约 10–25 分钟 | 约 3–5 分钟 |
| 500 GB | 约 50–120 分钟 | 约 5–8 分钟 |

> 实际受 HDD 随机读、文件数量、rsync 校验影响；建议先在 yyc3-77 用小库演练一次。

## 十三、风险与注意事项

| 风险 | 规避 |
| --- | --- |
| V3 挂载点重启后变化 | 写入 `/etc/fstab`，用 UUID 挂载 |
| 权限/属主丢失 | `rsync -aHAX --numeric-ids`，切勿用 `cp` 不带 `-a` |
| `postgresql.conf` 仍在旧盘 | 只改 `data_directory`，配置文件保持在 `/etc` |
| 备库 WAL 堆积 | 迁移窗口内监控槽保留；必要时临时提高 `wal_keep_size` |
| 误删旧目录 | 改名保留 ≥ 7 天，确认备份后再删 |
| 迁移后性能未提升 | 确认挂载确为 NVMe（`lsblk ROTA=0`），并应用 §八 参数 |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-11 | PGDATA 从 V2 HDD 迁 V3 NVMe 的三套执行单 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>

# Git 仓库同步指南

本项目 fork 自 [shipany-template](https://github.com/template-code-team/shipany-template)，通过配置双 remote 来保持与原仓库同步。

## 当前配置

| Remote   | 地址                                                          | 用途       |
| -------- | ------------------------------------------------------------- | ---------- |
| origin   | https://github.com/vectormedia/ai-app-web-shipany.git         | 你的仓库   |
| upstream | https://github.com/template-code-team/shipany-template.git    | 原始仓库   |

## 日常使用

### 推送你的修改

```bash
git add .
git commit -m "你的提交信息"
git push
```

### 同步原仓库更新

当原始仓库有新功能或修复时，执行以下命令同步：

```bash
# 1. 拉取原始仓库的更新
git fetch upstream

# 2. 确保在 main 分支
git checkout main

# 3. 合并原始仓库的更新
git merge upstream/main

# 4. 推送到你自己的仓库
git push
```

## 处理合并冲突

如果你本地有修改，合并时可能会产生冲突。有两种处理方式：

### 方式一：merge（推荐，保留完整历史）

```bash
git merge upstream/main
# 如有冲突，手动解决后：
git add .
git commit -m "Merge upstream/main"
git push
```

### 方式二：rebase（更干净的历史）

```bash
git rebase upstream/main
# 如有冲突，手动解决后：
git add .
git rebase --continue
git push --force-with-lease
```

## 重新配置 Remote（如需要）

如果需要重新配置，可以使用以下命令：

```bash
# 查看当前配置
git remote -v

# 添加 upstream
git remote add upstream https://github.com/template-code-team/shipany-template.git

# 修改 origin 地址
git remote set-url origin https://github.com/你的用户名/你的仓库名.git

# 删除某个 remote
git remote remove <remote名称>
```

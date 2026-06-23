# 项目高级操作

项目批量、状态变更、成员、分组、白名单等低频 / 管理员操作。日常主链路见 `project.md`。

## 命令列表

| 命令 | 简介 |
| --- | --- |
| `createProject` | 项目类型，对应 18.5 project/create 页面 type 字段 |
| `editProject` | 格式 YYYY-MM-DD |
| `batchEditProjects` | 项目 ID 列表，对应 18.5 project/batchEdit 页面 projectIdList[] 字段 |
| `startProject` | 格式 YYYY-MM-DD |
| `suspendProject` | 格式 YYYY-MM-DD |
| `activateProject` | 格式 YYYY-MM-DD |
| `closeProject` | 格式 YYYY-MM-DD |
| `deleteProject` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `unlinkProjectMember` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `addProjectWhitelist` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `unbindProjectWhitelist` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `setProjectOrder` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectTeam` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectGroup` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectManageMembers` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectWhitelist` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectDynamic` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `getProjectLinkedProducts` | 来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段 |
| `createProjectGroup` | 项目 ID，对齐禅道 18.5 project/createGroup 路径 {projectID} 段 |
| `editProjectGroup` | 用户组 ID，对齐禅道 18.5 project/editGroup 路径 {groupID} 段。注意 18.x control.php editGroup 只接 groupID，不再含 projectID |
| `copyProjectGroup` | 源用户组 ID，对齐禅道 18.5 project/copyGroup 路径 {groupID} 段。projectID 服务端从 group 反查 |

> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。
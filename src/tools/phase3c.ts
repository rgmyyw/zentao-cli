import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { optionalTrimmedText, runWithPreview, jsonResult } from './shared.js';

export function registerProductWriteTools(server: CliRegistry): void {
  server.tool('createProduct', {
    name: z.string().trim().min(1),
    code: z.string().trim().min(1),
    type: z.string().trim().min(1).describe('产品类型，对应 18.5 product/create 页面 type 字段'),
    status: optionalTrimmedText,
    line: z.number().int().nonnegative().optional(),
    desc: optionalTrimmedText,
    PO: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    whitelist: z.array(z.string().trim().min(1)).optional(),
    branches: z.array(z.string().trim().min(1)).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => runWithPreview('createProduct', confirm, payload, previewOrAssertWriteAllowed, () => getApi().product.createProduct(payload)));

  server.tool('editProduct', {
    productId: z.number().int().positive(),
    name: optionalTrimmedText,
    code: optionalTrimmedText,
    type: optionalTrimmedText,
    status: optionalTrimmedText,
    line: z.number().int().nonnegative().optional(),
    desc: optionalTrimmedText,
    PO: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    whitelist: z.array(z.string().trim().min(1)).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, confirm, ...update }) => runWithPreview('editProduct', confirm, { productId, update }, previewOrAssertWriteAllowed, () => getApi().product.editProduct(productId, update)));

  server.tool('batchEditProducts', {
    productIds: z.array(z.number().int().positive()).min(1).describe('产品 ID 列表，对应 18.5 product/batchEdit 页面 productIdList[] 字段'),
    type: optionalTrimmedText,
    PO: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ productIds, type, PO, QD, RD, acl, confirm }) => runWithPreview('batchEditProducts', confirm, { productIds, type, PO, QD, RD, acl }, previewOrAssertWriteAllowed, () => getApi().product.batchEditProducts({ productIds, type, PO, QD, RD, acl })));

  server.tool('closeProduct', {
    productId: z.number().int().positive(),
    status: z.enum(['closed', 'open']).optional().default('closed'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, status, confirm }) => runWithPreview('closeProduct', confirm, { productId, status }, previewOrAssertWriteAllowed, () => getApi().product.closeProduct(productId, status)));

  server.tool('deleteProduct', {
    productId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, confirm }) => runWithPreview('deleteProduct', confirm, { productId }, previewOrAssertWriteAllowed, () => getApi().product.deleteProduct(productId)));

  server.tool('addProductWhitelist', {
    productId: z.number().int().positive(),
    accounts: z.array(z.string().trim().min(1)).min(1).describe('白名单账号数组，对应 18.5 product/addWhitelist 页面 accounts 字段'),
    groups: z.array(z.number().int().positive()).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, accounts, groups, confirm }) => runWithPreview('addProductWhitelist', confirm, { productId, accounts, groups }, previewOrAssertWriteAllowed, () => getApi().product.addProductWhitelist({ productId, accounts, groups })));

  server.tool('unbindProductWhitelist', {
    productId: z.number().int().positive(),
    account: z.string().trim().min(1),
    group: z.number().int().positive().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, account, group, confirm }) => runWithPreview('unbindProductWhitelist', confirm, { productId, account, group }, previewOrAssertWriteAllowed, () => getApi().product.unbindProductWhitelist({ productId, account, group })));

  server.tool('setProductOrder', {
    productId: z.number().int().positive(),
    order: z.number().int(),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, order, confirm }) => runWithPreview('setProductOrder', confirm, { productId, order }, previewOrAssertWriteAllowed, () => getApi().product.setProductOrder(productId, order)));

  server.tool('getProductAll', {
    status: optionalTrimmedText,
    orderBy: optionalTrimmedText,
    limit: z.number().int().positive().optional(),
  }, async ({ status, orderBy, limit }) => jsonResult(await getApi().product.getProductAll({ status, orderBy, limit })), {
    costHint: 'medium',
    nextBestTools: ['getProductDetail', 'getProductTrack', 'getProducts'],
  });

  server.tool('getProductTrack', {
    productId: z.number().int().positive(),
  }, async ({ productId }) => jsonResult(await getApi().product.getProductTrack(productId)), {
    costHint: 'medium',
    nextBestTools: ['getProductDetail', 'getProductDynamic', 'getProductDashboard'],
  });

  server.tool('getProductWhitelist', {
    productId: z.number().int().positive(),
  }, async ({ productId }) => jsonResult(await getApi().product.getProductWhitelist(productId)), {
    costHint: 'low',
    nextBestTools: ['getProductDetail', 'getProductTrack', 'getProductDashboard'],
  });

  server.tool('getProductDashboard', {
    productId: z.number().int().positive(),
  }, async ({ productId }) => jsonResult(await getApi().product.getProductDashboard(productId)), {
    costHint: 'medium',
    nextBestTools: ['getProductRoadmap', 'getProductDynamic', 'getProductTrack'],
  });

  server.tool('getProductRoadmap', {
    productId: z.number().int().positive(),
  }, async ({ productId }) => jsonResult(await getApi().product.getProductRoadmap(productId)), {
    costHint: 'medium',
    nextBestTools: ['getProductDashboard', 'getProductTrack', 'getProductDynamic'],
  });

  server.tool('getProductDynamic', {
    productId: z.number().int().positive(),
  }, async ({ productId }) => jsonResult(await getApi().product.getProductDynamic(productId)), {
    costHint: 'medium',
    nextBestTools: ['getProductTrack', 'getProductDashboard', 'getComments'],
  });

  server.tool('exportProducts', {
    productId: z.number().int().positive(),
  }, async ({ productId }) => jsonResult(await getApi().product.exportProducts(productId)));
}

export function registerProjectWriteTools(server: CliRegistry): void {
  server.tool('createProject', {
    name: z.string().trim().min(1),
    code: z.string().trim().min(1),
    type: z.string().trim().min(1).describe('项目类型，对应 18.5 project/create 页面 type 字段'),
    parent: z.number().int().positive().optional(),
    model: optionalTrimmedText,
    begin: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    end: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    days: z.number().int().positive().optional(),
    desc: optionalTrimmedText,
    PM: optionalTrimmedText,
    PO: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    whitelist: z.array(z.string().trim().min(1)).optional(),
    teamMembers: z.array(z.string().trim().min(1)).optional(),
    products: z.array(z.number().int().positive()).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => runWithPreview('createProject', confirm, payload, previewOrAssertWriteAllowed, () => getApi().project.createProject(payload)));

  server.tool('editProject', {
    projectId: z.number().int().positive(),
    name: optionalTrimmedText,
    code: optionalTrimmedText,
    type: optionalTrimmedText,
    parent: z.number().int().positive().optional(),
    model: optionalTrimmedText,
    begin: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    end: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    days: z.number().int().positive().optional(),
    desc: optionalTrimmedText,
    PM: optionalTrimmedText,
    PO: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    whitelist: z.array(z.string().trim().min(1)).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, confirm, ...update }) => runWithPreview('editProject', confirm, { projectId, update }, previewOrAssertWriteAllowed, () => getApi().project.editProject(projectId, update)));

  server.tool('batchEditProjects', {
    projectIds: z.array(z.number().int().positive()).min(1).describe('项目 ID 列表，对应 18.5 project/batchEdit 页面 projectIdList[] 字段'),
    type: optionalTrimmedText,
    PM: optionalTrimmedText,
    PO: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ projectIds, type, PM, PO, QD, RD, acl, confirm }) => runWithPreview('batchEditProjects', confirm, { projectIds, type, PM, PO, QD, RD, acl }, previewOrAssertWriteAllowed, () => getApi().project.batchEditProjects({ projectIds, type, PM, PO, QD, RD, acl })));

  server.tool('startProject', {
    projectId: z.number().int().positive(),
    realBegan: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, realBegan, confirm }) => runWithPreview('startProject', confirm, { projectId, realBegan }, previewOrAssertWriteAllowed, () => getApi().project.startProject(projectId, realBegan)));

  server.tool('suspendProject', {
    projectId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, comment, confirm }) => runWithPreview('suspendProject', confirm, { projectId, comment }, previewOrAssertWriteAllowed, () => getApi().project.suspendProject(projectId, comment)));

  server.tool('activateProject', {
    projectId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, comment, confirm }) => runWithPreview('activateProject', confirm, { projectId, comment }, previewOrAssertWriteAllowed, () => getApi().project.activateProject(projectId, comment)));

  server.tool('closeProject', {
    projectId: z.number().int().positive(),
    realEnd: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, realEnd, comment, confirm }) => runWithPreview('closeProject', confirm, { projectId, realEnd, comment }, previewOrAssertWriteAllowed, () => getApi().project.closeProject(projectId, realEnd, comment)));

  server.tool('deleteProject', {
    projectId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, confirm }) => runWithPreview('deleteProject', confirm, { projectId }, previewOrAssertWriteAllowed, () => getApi().project.deleteProject(projectId)));

  server.tool('unlinkProjectMember', {
    projectId: z.number().int().positive(),
    userId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, userId, confirm }) => runWithPreview('unlinkProjectMember', confirm, { projectId, userId }, previewOrAssertWriteAllowed, () => getApi().project.unlinkProjectMember(projectId, userId)));

  server.tool('addProjectWhitelist', {
    projectId: z.number().int().positive(),
    accounts: z.array(z.string().trim().min(1)).min(1).describe('白名单账号数组'),
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, accounts, confirm }) => runWithPreview('addProjectWhitelist', confirm, { projectId, accounts }, previewOrAssertWriteAllowed, () => getApi().project.addProjectWhitelist({ projectId, accounts })));

  server.tool('unbindProjectWhitelist', {
    projectId: z.number().int().positive(),
    account: z.string().trim().min(1),
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, account, confirm }) => runWithPreview('unbindProjectWhitelist', confirm, { projectId, account }, previewOrAssertWriteAllowed, () => getApi().project.unbindProjectWhitelist({ projectId, account })));

  server.tool('setProjectOrder', {
    projectId: z.number().int().positive(),
    order: z.number().int(),
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, order, confirm }) => runWithPreview('setProjectOrder', confirm, { projectId, order }, previewOrAssertWriteAllowed, () => getApi().project.setProjectOrder(projectId, order)));

  server.tool('getProjectTeam', {
    projectId: z.number().int().positive(),
  }, async ({ projectId }) => jsonResult(await getApi().project.getProjectTeam(projectId)), {
    costHint: 'low',
    nextBestTools: ['getProjectDetail', 'getProjectManageMembers', 'getProjectGroup'],
  });

  server.tool('getProjectGroup', {
    projectId: z.number().int().positive(),
  }, async ({ projectId }) => jsonResult(await getApi().project.getProjectGroup(projectId)), {
    costHint: 'low',
    nextBestTools: ['getProjectTeam', 'getProjectManageMembers', 'getProjectWhitelist'],
  });

  server.tool('getProjectManageMembers', {
    projectId: z.number().int().positive(),
  }, async ({ projectId }) => jsonResult(await getApi().project.manageProjectMembers(projectId)), {
    costHint: 'low',
    nextBestTools: ['getProjectTeam', 'getProjectGroup', 'getProjectDetail'],
  });

  server.tool('getProjectWhitelist', {
    projectId: z.number().int().positive(),
  }, async ({ projectId }) => jsonResult(await getApi().project.getProjectWhitelist(projectId)), {
    costHint: 'low',
    nextBestTools: ['getProjectDetail', 'getProjectManageMembers', 'getProjectGroup'],
  });

  server.tool('getProjectDynamic', {
    projectId: z.number().int().positive(),
  }, async ({ projectId }) => jsonResult(await getApi().project.getProjectDynamic(projectId)), {
    costHint: 'medium',
    nextBestTools: ['getProjectDetail', 'getProjectExecutions', 'getComments'],
  });

  server.tool('getProjectLinkedProducts', {
    projectId: z.number().int().positive(),
    from: optionalTrimmedText.describe('来源标识，默认 project。禅道 18.5 project/manageProducts 路径 {projectID}-{from} 段'),
  }, async ({ projectId, from }) => jsonResult(await getApi().project.getProjectLinkedProducts(projectId, from ?? 'project')), {
    costHint: 'low',
    nextBestTools: ['getProjectDetail', 'getProducts', 'getProductDetail'],
  });

  server.tool('createProjectGroup', {
    projectId: z.number().int().positive().describe('项目 ID，对齐禅道 18.5 project/createGroup 路径 {projectID} 段'),
    name: z.string().trim().min(1),
    desc: optionalTrimmedText,
    PM: optionalTrimmedText,
    limit: z.number().int().positive().optional(),
    roles: z.array(z.string().trim().min(1)).optional(),
    accounts: z.array(z.string().trim().min(1)).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ projectId, confirm, ...payload }) => runWithPreview('createProjectGroup', confirm, { projectId, ...payload }, previewOrAssertWriteAllowed, () => getApi().project.createProjectGroup({ projectId, ...payload })));

  server.tool('editProjectGroup', {
    groupId: z.number().int().positive().describe('用户组 ID，对齐禅道 18.5 project/editGroup 路径 {groupID} 段。注意 18.x control.php editGroup 只接 groupID，不再含 projectID'),
    name: optionalTrimmedText,
    desc: optionalTrimmedText,
    PM: optionalTrimmedText,
    limit: z.number().int().positive().optional(),
    roles: z.array(z.string().trim().min(1)).optional(),
    accounts: z.array(z.string().trim().min(1)).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ groupId, confirm, ...update }) => runWithPreview('editProjectGroup', confirm, { groupId, update }, previewOrAssertWriteAllowed, () => getApi().project.editProjectGroup({ groupId, ...update })));

  server.tool('copyProjectGroup', {
    fromGroupId: z.number().int().positive().describe('源用户组 ID，对齐禅道 18.5 project/copyGroup 路径 {groupID} 段。projectID 服务端从 group 反查'),
    name: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ fromGroupId, name, confirm }) => runWithPreview('copyProjectGroup', confirm, { fromGroupId, name }, previewOrAssertWriteAllowed, () => getApi().project.copyProjectGroup(fromGroupId, name)));
}

export function registerProgramWriteTools(server: CliRegistry): void {
  server.tool('createProgram', {
    name: z.string().trim().min(1),
    parent: z.number().int().positive().optional(),
    budget: optionalTrimmedText,
    budgetUnit: optionalTrimmedText,
    begin: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    end: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    days: z.number().int().positive().optional(),
    desc: optionalTrimmedText,
    PM: optionalTrimmedText,
    PO: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    whitelist: z.array(z.string().trim().min(1)).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => runWithPreview('createProgram', confirm, payload, previewOrAssertWriteAllowed, () => getApi().program.createProgram(payload)));

  server.tool('editProgram', {
    programId: z.number().int().positive(),
    name: optionalTrimmedText,
    parent: z.number().int().positive().optional(),
    budget: optionalTrimmedText,
    budgetUnit: optionalTrimmedText,
    begin: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    end: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    days: z.number().int().positive().optional(),
    desc: optionalTrimmedText,
    PM: optionalTrimmedText,
    PO: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    whitelist: z.array(z.string().trim().min(1)).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, confirm, ...update }) => runWithPreview('editProgram', confirm, { programId, update }, previewOrAssertWriteAllowed, () => getApi().program.editProgram(programId, update)));

  server.tool('startProgram', {
    programId: z.number().int().positive(),
    realBegan: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, realBegan, comment, confirm }) => runWithPreview('startProgram', confirm, { programId, realBegan, comment }, previewOrAssertWriteAllowed, () => getApi().program.startProgram(programId, realBegan, comment)));

  server.tool('activateProgram', {
    programId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, comment, confirm }) => runWithPreview('activateProgram', confirm, { programId, comment }, previewOrAssertWriteAllowed, () => getApi().program.activateProgram(programId, comment)));

  server.tool('suspendProgram', {
    programId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, comment, confirm }) => runWithPreview('suspendProgram', confirm, { programId, comment }, previewOrAssertWriteAllowed, () => getApi().program.suspendProgram(programId, comment)));

  server.tool('closeProgram', {
    programId: z.number().int().positive(),
    realEnd: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, realEnd, comment, confirm }) => runWithPreview('closeProgram', confirm, { programId, realEnd, comment }, previewOrAssertWriteAllowed, () => getApi().program.closeProgram(programId, realEnd, comment)));

  server.tool('deleteProgram', {
    programId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, confirm }) => runWithPreview('deleteProgram', confirm, { programId }, previewOrAssertWriteAllowed, () => getApi().program.deleteProgram(programId)));

  server.tool('createProgramStakeholder', {
    programId: z.number().int().positive(),
    account: z.string().trim().min(1),
    role: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, account, role, confirm }) => runWithPreview('createProgramStakeholder', confirm, { programId, account, role }, previewOrAssertWriteAllowed, () => getApi().program.createProgramStakeholder({ programId, account, role })));

  server.tool('unlinkProgramStakeholder', {
    programId: z.number().int().positive(),
    account: z.string().trim().min(1),
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, account, confirm }) => runWithPreview('unlinkProgramStakeholder', confirm, { programId, account }, previewOrAssertWriteAllowed, () => getApi().program.unlinkProgramStakeholder({ programId, account })));

  server.tool('batchUnlinkProgramStakeholders', {
    programId: z.number().int().positive(),
    accounts: z.array(z.string().trim().min(1)).min(1).describe('干系人账号数组，对应 18.5 program/batchUnlinkStakeholders 页面 userIdList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, accounts, confirm }) => runWithPreview('batchUnlinkProgramStakeholders', confirm, { programId, accounts }, previewOrAssertWriteAllowed, () => getApi().program.batchUnlinkProgramStakeholders({ programId, accounts })));

  server.tool('unbindProgramWhitelist', {
    programId: z.number().int().positive(),
    account: z.string().trim().min(1),
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, account, confirm }) => runWithPreview('unbindProgramWhitelist', confirm, { programId, account }, previewOrAssertWriteAllowed, () => getApi().program.unbindProgramWhitelist({ programId, account })));

  server.tool('setProgramOrder', {
    programId: z.number().int().positive(),
    order: z.number().int(),
    confirm: z.boolean().optional().default(false),
  }, async ({ programId, order, confirm }) => runWithPreview('setProgramOrder', confirm, { programId, order }, previewOrAssertWriteAllowed, () => getApi().program.setProgramOrder(programId, order)));

  server.tool('getProgramAll', {
    status: optionalTrimmedText,
    orderBy: optionalTrimmedText,
    limit: z.number().int().positive().optional(),
  }, async ({ status, orderBy, limit }) => jsonResult(await getApi().program.getProgramAll({ status, orderBy, limit })), {
    costHint: 'medium',
    nextBestTools: ['getPrograms', 'getProgramDetail', 'getProgramTrack'],
  });

  server.tool('getProgramTrack', {
    programId: z.number().int().positive(),
  }, async ({ programId }) => jsonResult(await getApi().program.getProgramTrack(programId)), {
    costHint: 'medium',
    nextBestTools: ['getProgramDetail', 'getProgramStakeholders', 'getProgramAll'],
  });

  server.tool('getProgramStakeholders', {
    programId: z.number().int().positive(),
  }, async ({ programId }) => jsonResult(await getApi().program.getProgramStakeholders(programId)), {
    costHint: 'low',
    nextBestTools: ['getProgramDetail', 'getProgramTrack', 'getPrograms'],
  });
}

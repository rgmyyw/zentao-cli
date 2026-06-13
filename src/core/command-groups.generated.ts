// 由 scripts/generate-manifest.ts 在 build 时自动生成，请勿手动编辑。

export const commandToGroup: Record<string, string> = {
  "initZentao": "init",
  "activateTask": "task",
  "assignTask": "task",
  "closeTask": "task",
  "deleteTask": "task",
  "finishTask": "task",
  "getMyTasks": "task",
  "getTaskDetail": "task",
  "pauseTask": "task",
  "recordTaskEstimate": "task",
  "restartTask": "task",
  "startTask": "task",
  "updateTask": "task",
  "activateTodo": "todo",
  "createTodo": "todo",
  "deleteTodo": "todo",
  "finishTodo": "todo",
  "getMyTodos": "todo",
  "getTodoDetail": "todo",
  "updateTodo": "todo",
  "activateBug": "bug",
  "assignBug": "bug",
  "closeBug": "bug",
  "confirmBug": "bug",
  "createBug": "bug",
  "deleteBug": "bug",
  "getBugDetail": "bug",
  "getMyBugs": "bug",
  "getProductBugs": "bug",
  "okBug": "bug",
  "resolveBug": "bug",
  "updateBug": "bug",
  "getProductStories": "story",
  "getStoryDetail": "story",
  "getExecutionBugs": "execution",
  "getExecutionBuilds": "execution",
  "getExecutionDailyBugStats": "execution",
  "getExecutionDetail": "execution",
  "getExecutionDynamic": "execution",
  "getProjectExecutions": "execution",
  "addComment": "comment",
  "getComments": "comment",
  "getMyProfile": "profile",
  "who-am-i": "profile",
  "whoami": "profile",
  "getMyBugStatistics": "statistics",
  "getMyTaskStatistics": "statistics",
  "getMyWeeklyActivity": "statistics",
  "getBugRelatedStory": "relation",
  "getStoryRelatedBugs": "relation",
  "getDevelopmentContext": "context",
  "getProductDetail": "product",
  "getProducts": "product",
  "getProjectDetail": "project",
  "getProjects": "project",
  "getProductTestCases": "testcase",
  "getTestCaseDetail": "testcase",
  "getTestTaskDetail": "testtask",
  "getTestTasks": "testtask",
  "getProgramDetail": "program",
  "getPrograms": "program",
  "getPlanDetail": "plan",
  "getProductPlans": "plan",
  "getBuildDetail": "build",
  "getProjectBuilds": "build",
  "getProjectReleases": "release",
  "getReleaseDetail": "release",
  "analyzeBugResources": "resource-analysis",
  "analyzeTaskResources": "resource-analysis",
  "searchStories": "search",
  "searchStoriesByProductName": "search",
  "activateStory": "story-write",
  "assignStory": "story-write",
  "changeStory": "story-write",
  "closeStory": "story-write",
  "createStory": "story-write",
  "reviewStory": "story-write",
  "updateStory": "story-write",
  "createTaskFromBug": "task-derived",
  "createTaskFromStory": "task-derived",
  "linkBugsToPlan": "plan-relation",
  "linkStoriesToPlan": "plan-relation",
  "unlinkBugsFromPlan": "plan-relation",
  "unlinkStoriesFromPlan": "plan-relation",
  "activateExecution": "execution-write",
  "closeExecution": "execution-write",
  "putoffExecution": "execution-write",
  "startExecution": "execution-write",
  "suspendExecution": "execution-write",
  "updateExecution": "execution-write",
  "createBuild": "build-write",
  "updateBuild": "build-write",
  "createTestCase": "testcase-write",
  "updateTestCase": "testcase-write",
  "createTestTask": "testtask-write",
  "updateTestTask": "testtask-write"
};

export const groupCommands: Record<string, string[]> = {
  "init": [
    "initZentao"
  ],
  "task": [
    "activateTask",
    "assignTask",
    "closeTask",
    "deleteTask",
    "finishTask",
    "getMyTasks",
    "getTaskDetail",
    "pauseTask",
    "recordTaskEstimate",
    "restartTask",
    "startTask",
    "updateTask"
  ],
  "todo": [
    "activateTodo",
    "createTodo",
    "deleteTodo",
    "finishTodo",
    "getMyTodos",
    "getTodoDetail",
    "updateTodo"
  ],
  "bug": [
    "activateBug",
    "assignBug",
    "closeBug",
    "confirmBug",
    "createBug",
    "deleteBug",
    "getBugDetail",
    "getMyBugs",
    "getProductBugs",
    "okBug",
    "resolveBug",
    "updateBug"
  ],
  "story": [
    "getProductStories",
    "getStoryDetail"
  ],
  "execution": [
    "getExecutionBugs",
    "getExecutionBuilds",
    "getExecutionDailyBugStats",
    "getExecutionDetail",
    "getExecutionDynamic",
    "getProjectExecutions"
  ],
  "comment": [
    "addComment",
    "getComments"
  ],
  "profile": [
    "getMyProfile",
    "who-am-i",
    "whoami"
  ],
  "statistics": [
    "getMyBugStatistics",
    "getMyTaskStatistics",
    "getMyWeeklyActivity"
  ],
  "relation": [
    "getBugRelatedStory",
    "getStoryRelatedBugs"
  ],
  "context": [
    "getDevelopmentContext"
  ],
  "product": [
    "getProductDetail",
    "getProducts"
  ],
  "project": [
    "getProjectDetail",
    "getProjects"
  ],
  "testcase": [
    "getProductTestCases",
    "getTestCaseDetail"
  ],
  "testtask": [
    "getTestTaskDetail",
    "getTestTasks"
  ],
  "program": [
    "getProgramDetail",
    "getPrograms"
  ],
  "plan": [
    "getPlanDetail",
    "getProductPlans"
  ],
  "build": [
    "getBuildDetail",
    "getProjectBuilds"
  ],
  "release": [
    "getProjectReleases",
    "getReleaseDetail"
  ],
  "resource-analysis": [
    "analyzeBugResources",
    "analyzeTaskResources"
  ],
  "search": [
    "searchStories",
    "searchStoriesByProductName"
  ],
  "story-write": [
    "activateStory",
    "assignStory",
    "changeStory",
    "closeStory",
    "createStory",
    "reviewStory",
    "updateStory"
  ],
  "task-derived": [
    "createTaskFromBug",
    "createTaskFromStory"
  ],
  "plan-relation": [
    "linkBugsToPlan",
    "linkStoriesToPlan",
    "unlinkBugsFromPlan",
    "unlinkStoriesFromPlan"
  ],
  "execution-write": [
    "activateExecution",
    "closeExecution",
    "putoffExecution",
    "startExecution",
    "suspendExecution",
    "updateExecution"
  ],
  "build-write": [
    "createBuild",
    "updateBuild"
  ],
  "testcase-write": [
    "createTestCase",
    "updateTestCase"
  ],
  "testtask-write": [
    "createTestTask",
    "updateTestTask"
  ]
};

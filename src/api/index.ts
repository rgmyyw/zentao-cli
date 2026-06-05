import { BugApi } from './bug.js';
import { BuildApi } from './build.js';
import { CommentApi } from './comment.js';
import { DevelopmentContextApi } from './development-context.js';
import { ExecutionApi } from './execution.js';
import { ProductApi } from './product.js';
import { ProgramApi } from './program.js';
import { ProjectApi } from './project.js';
import { PlanApi } from './plan.js';
import { ReleaseApi } from './release.js';
import { SearchApi } from './search.js';
import { RelationApi } from './relation.js';
import { StatisticsApi } from './statistics.js';
import { StoryApi } from './story.js';
import { TaskApi } from './task.js';
import { TestCaseApi } from './testcase.js';
import { TestTaskApi } from './testtask.js';
import { UserApi } from './user.js';
import { ZentaoHttpClient } from '../core/http.js';
import type { ZentaoConfig } from '../types/common.js';

export class ZentaoApi {
  readonly http: ZentaoHttpClient;
  readonly task: TaskApi;
  readonly bug: BugApi;
  readonly story: StoryApi;
  readonly execution: ExecutionApi;
  readonly comment: CommentApi;
  readonly user: UserApi;
  readonly statistics: StatisticsApi;
  readonly relation: RelationApi;
  readonly developmentContext: DevelopmentContextApi;
  readonly product: ProductApi;
  readonly project: ProjectApi;
  readonly testcase: TestCaseApi;
  readonly testtask: TestTaskApi;
  readonly program: ProgramApi;
  readonly plan: PlanApi;
  readonly build: BuildApi;
  readonly release: ReleaseApi;
  readonly search: SearchApi;

  constructor(config: ZentaoConfig) {
    this.http = new ZentaoHttpClient(config);
    this.task = new TaskApi(this.http);
    this.bug = new BugApi(this.http);
    this.story = new StoryApi(this.http);
    this.execution = new ExecutionApi(this.http);
    this.comment = new CommentApi(this.http);
    this.user = new UserApi(this.http);
    this.statistics = new StatisticsApi(this.task, this.bug);
    this.relation = new RelationApi(this.bug, this.story);
    this.developmentContext = new DevelopmentContextApi(this.bug, this.story, this.relation);
    this.product = new ProductApi(this.http);
    this.project = new ProjectApi(this.http);
    this.testcase = new TestCaseApi(this.http);
    this.testtask = new TestTaskApi(this.http);
    this.program = new ProgramApi(this.http);
    this.plan = new PlanApi(this.http);
    this.build = new BuildApi(this.http);
    this.release = new ReleaseApi(this.http);
    this.search = new SearchApi(this.product, this.story);
  }

  getToken(): Promise<string> {
    return this.http.getToken();
  }
}

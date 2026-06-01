// 온보딩 "샘플로 시작" 코퍼스 — 이 기능의 자체 산출물 3개를 dogfooding (출처=claude design 결정).
// specs/ 의 실제 plan 문서를 ?raw 로 가져와 내용이 항상 실제와 동기됨.
import specMd from '../specs/003-design-system-adoption/spec.md?raw';
import planMd from '../specs/003-design-system-adoption/plan.md?raw';
import tasksMd from '../specs/003-design-system-adoption/tasks.md?raw';

export interface Sample {
  title: string;
  source: string;
}

export const SAMPLES: Sample[] = [
  { title: 'spec · 003 디자인 시스템 도입', source: specMd },
  { title: 'plan · 003 디자인 시스템 도입', source: planMd },
  { title: 'tasks · 003 디자인 시스템 도입', source: tasksMd },
];

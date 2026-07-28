const data1 = JSON.stringify({
  mission: { title: 'Study Mechanics' },
  weakTopics: [],
  revisionQueue: [],
  chapters: [],
  studyHistory: [],
  remainingDays: 100,
  analyticsSummary: {}
});

const data2 = JSON.stringify({
  mission: { title: 'Study Mechanics' },
  weakTopics: [],
  revisionQueue: [],
  chapters: [],
  studyHistory: [],
  remainingDays: 100,
  analyticsSummary: {},
  question: 'How do I balance math and physics?'
});

async function makeReq(data) {
  const r = await fetch('http://localhost:3000/api/coach/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data
  });
  return await r.json();
}

(async () => {
  console.log('Testing summary...');
  console.log(await makeReq(data1));
  console.log('Testing question...');
  console.log(await makeReq(data2));
})();

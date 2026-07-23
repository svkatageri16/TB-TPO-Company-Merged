const q = {
  question_type: "MCQ",
  options_json: '["O(n)","O(log n)","O(n log n)","O(1)"]',
  correct_answers_json: '[0]'
};
let correctAnswers = JSON.parse(q.correct_answers_json || "[]");
let options = JSON.parse(q.options_json || "[]");

if (['MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'].includes(q.question_type) && options.length > 0) {
  correctAnswers = correctAnswers.map((ans: any) => {
    if (typeof ans === 'number' && options[ans] !== undefined) {
      return options[ans];
    } else if (typeof ans === 'string' && !isNaN(parseInt(ans)) && options[parseInt(ans)] !== undefined) {
      return options[parseInt(ans)];
    }
    return ans;
  });
}
console.log("correctAnswers:", correctAnswers);
const studentAns = ["O(n)"];
const isCorrect = studentAns[0] === correctAnswers[0];
console.log("isCorrect:", isCorrect);

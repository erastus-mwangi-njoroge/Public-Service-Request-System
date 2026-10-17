// The life of a paid request. Rules live here, not in the HTTP layer.
const FLOW = ["Submitted", "Under review", "Approved", "Completed"];
const CLOSED = ["Completed", "Rejected"];
const canMove = (from, to) => {
  const i = FLOW.indexOf(from);
  return (to === "Rejected" && i >= 0 && i < 3) || FLOW.indexOf(to) === i + 1;
};
module.exports = { FLOW, CLOSED, canMove };


module.exports = {
    calcHours: function (start, end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);

          const startMin = sh * 60 + sm;
          const endMin   = eh * 60 + em;

          const diffMin = endMin - startMin;
          return (diffMin / 60).toFixed(1); // 1 chữ số thập phân
        },
        sortPriority: ((a,b) =>
            a.priority !== b.priority
              ? a.priority - b.priority
              : new Date(b.createdAt) - new Date(a.createdAt)
          )
}
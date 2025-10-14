// studio/utils/quizPublishBadge.js

const toIso = (value) => {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
};

const formatLabelDate = (iso) => {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
  } catch (error) {
    console.warn('[quizPublishBadge] failed to format date', iso, error);
    return '';
  }
};

export const createQuizPublishBadge = (document) => {
  if (!document) return null;

  const publishedIso = toIso(document.publishedAt);
  const createdIso = toIso(document._createdAt);
  const effectiveIso = publishedIso || createdIso;

  if (!effectiveIso) {
    return {
      label: '公開日未設定',
      color: 'default'
    };
  }

  const publishedTime = publishedIso ? Date.parse(publishedIso) : Number.NaN;
  const now = Date.now();

  if (!Number.isNaN(publishedTime) && publishedTime > now) {
    return {
      label: '公開予定',
      title: `公開予定: ${formatLabelDate(publishedIso)}`,
      color: 'warning'
    };
  }

  return {
    label: '公開済み',
    title: `公開済み: ${formatLabelDate(effectiveIso)}`,
    color: 'success'
  };
};

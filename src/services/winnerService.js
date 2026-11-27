import { request } from '../config/apiConfig.js';

const winnerFields = [
  'winnerId',
  'event',
  'awardCategory',
  'awardTitle',
  'groupCode',
  'awardYear',
  'displayOrder',
  'isPublished'
];

export function validateWinners(winners) {
  if (!Array.isArray(winners)) return [];
  return winners
    .filter((w) => w && typeof w === 'object')
    .map((item) => {
      const obj = {};
      winnerFields.forEach((field) => {
        obj[field] = item?.[field] !== undefined ? item[field] : '';
      });
      obj.winnerId = String(obj.winnerId || '').trim();
      obj.event = String(obj.event || '').trim();
      obj.awardCategory = String(obj.awardCategory || '').trim() || 'General Awards';
      obj.awardTitle = String(obj.awardTitle || '').trim();
      obj.groupCode = String(obj.groupCode || '').trim();
      obj.awardYear = String(obj.awardYear || '').trim();
      const order = parseInt(obj.displayOrder, 10);
      obj.displayOrder = !isNaN(order) ? order : 999;
      const pubStr = String(obj.isPublished).trim().toLowerCase();
      obj.isPublished = pubStr === 'true' || pubStr === '1' || pubStr === 'yes' || obj.isPublished === true;
      return obj;
    })
    .filter((w) => w.isPublished);
}

export async function getWinners() {
  try {
    const response = await request('getWinners');
    if (response?.data && Array.isArray(response.data)) {
      return validateWinners(response.data);
    }
    return [];
  } catch {
    // If the backend has not deployed getWinners or Winners sheet is empty,
    // safely return [] so that the UI gracefully displays a clean empty state.
    return [];
  }
}

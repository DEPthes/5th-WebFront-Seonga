import type { TransactionType } from "./types";

// select의 "직접추가" 옵션을 구분하는 값. 실제 카테고리명과 겹치지 않도록 예약된 문자열.
export const CUSTOM_CATEGORY = "__custom__";

const STORAGE_KEY = "ledger-custom-categories";

const DEFAULT_CATEGORIES: Record<TransactionType, string[]> = {
  expense: [
    "식비",
    "교통비",
    "주거/관리비",
    "통신비",
    "생활용품",
    "의료/건강",
    "문화/여가",
    "쇼핑",
    "교육",
    "경조사",
    "기타",
  ],
  income: ["급여", "용돈", "부수입", "투자수익", "환급/보너스", "기타"],
};

function loadCustom(): Record<TransactionType, string[]> {
  try {
    // localStorage 값이 수동 편집 등으로 깨져있을 수 있어 방어적으로 처리
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { income: [], expense: [] };
  } catch {
    return { income: [], expense: [] };
  }
}

export function getCategories(type: TransactionType): string[] {
  return [...DEFAULT_CATEGORIES[type], ...loadCustom()[type]];
}

export function addCategory(type: TransactionType, category: string): void {
  if (!category || getCategories(type).includes(category)) return;
  const custom = loadCustom();
  custom[type].push(category);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch {
    // 저장 공간 초과, 시크릿 모드 등으로 쓰기가 막혀도 앱 동작은 계속되게 함
  }
}

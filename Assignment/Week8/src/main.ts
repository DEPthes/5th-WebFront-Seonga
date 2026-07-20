import "./style.css";
import { addCategory, CUSTOM_CATEGORY, getCategories } from "./categories";
import { Ledger } from "./Ledger";
import type { TransactionType } from "./types";

const ledger = new Ledger();
const currency = new Intl.NumberFormat("ko-KR");

const form = document.querySelector<HTMLFormElement>("#transaction-form")!;
const typeInput = document.querySelector<HTMLSelectElement>("#type")!;
const categorySelect = document.querySelector<HTMLSelectElement>("#category")!;
const categoryCustomWrap = document.querySelector<HTMLElement>("#category-custom-wrap")!;
const categoryCustomInput = document.querySelector<HTMLInputElement>("#category-custom")!;
const categorySaveCheckbox = document.querySelector<HTMLInputElement>("#category-save")!;
const amountInput = document.querySelector<HTMLInputElement>("#amount")!;
const dateInput = document.querySelector<HTMLInputElement>("#date")!;
const memoInput = document.querySelector<HTMLInputElement>("#memo")!;
const listBody = document.querySelector<HTMLTableSectionElement>("#transaction-list")!;
const totalIncomeEl = document.querySelector<HTMLElement>("#total-income")!;
const totalExpenseEl = document.querySelector<HTMLElement>("#total-expense")!;
const balanceEl = document.querySelector<HTMLElement>("#balance")!;

dateInput.valueAsDate = new Date();

// 카테고리/메모는 사용자 입력 그대로 innerHTML에 들어가므로 XSS 방지를 위해 이스케이프
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function refreshCategoryOptions(): void {
  const type = typeInput.value as TransactionType;
  const options = [...getCategories(type), CUSTOM_CATEGORY];
  categorySelect.innerHTML = options
    .map((c) => `<option value="${escapeHtml(c)}">${c === CUSTOM_CATEGORY ? "직접추가" : escapeHtml(c)}</option>`)
    .join("");
  showCustomInput(false);
}

function showCustomInput(show: boolean): void {
  categoryCustomWrap.hidden = !show;
  categoryCustomInput.required = show;
  if (!show) {
    categoryCustomInput.value = "";
    categorySaveCheckbox.checked = true; // 다음에 "직접추가"를 열 때 기본값(저장함)으로 되돌림
  }
}

typeInput.addEventListener("change", refreshCategoryOptions);
categorySelect.addEventListener("change", () => {
  showCustomInput(categorySelect.value === CUSTOM_CATEGORY);
});

function render(): void {
  totalIncomeEl.textContent = `${currency.format(ledger.getTotalIncome())}원`;
  totalExpenseEl.textContent = `${currency.format(ledger.getTotalExpense())}원`;
  balanceEl.textContent = `${currency.format(ledger.getBalance())}원`;

  listBody.innerHTML = ledger
    .getTransactions()
    .map(
      (t) => `
        <tr data-id="${t.id}">
          <td>${t.date}</td>
          <td class="${t.type}">${t.type === "income" ? "수입" : "지출"}</td>
          <td>${escapeHtml(t.category)}</td>
          <td>${escapeHtml(t.memo)}</td>
          <td class="amount ${t.type}">${t.type === "income" ? "+" : "-"}${currency.format(t.amount)}원</td>
          <td><button class="delete-btn" data-id="${t.id}" type="button" aria-label="${escapeHtml(t.category)} 삭제">삭제</button></td>
        </tr>
      `,
    )
    .join("");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const type = typeInput.value as TransactionType;
  const isCustom = categorySelect.value === CUSTOM_CATEGORY;
  const category = (isCustom ? categoryCustomInput.value : categorySelect.value).trim();
  const amount = Number(amountInput.value);
  // HTML required/min 속성은 form.requestSubmit() 등으로 우회될 수 있어 한 번 더 검증
  if (!category || !Number.isFinite(amount) || amount <= 0) return;

  ledger.addTransaction({
    type,
    category,
    amount,
    date: dateInput.value,
    memo: memoInput.value,
  });

  if (isCustom && categorySaveCheckbox.checked) addCategory(type, category);
  refreshCategoryOptions();

  form.reset();
  dateInput.valueAsDate = new Date();
  render();
});

listBody.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (!target.matches(".delete-btn")) return;
  const id = Number(target.dataset.id);
  ledger.removeTransaction(id);
  render();
});

refreshCategoryOptions();
render();

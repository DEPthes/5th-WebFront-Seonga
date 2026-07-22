import "./style.css";
import { addCategory, CUSTOM_CATEGORY, getCategories } from "./categories";
import { Ledger } from "./Ledger";
import { validateTransactionInput } from "./validators";
import { getCategoryTotals, getMonthlyTotals, getIncomeExpenseRatio, type CategoryTotal } from "./stats";
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

const tabButtons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
const ledgerView = document.querySelector<HTMLElement>("#ledger-view")!;
const statsView = document.querySelector<HTMLElement>("#stats-view")!;
const categoryStatsEl = document.querySelector<HTMLElement>("#category-stats")!;
const monthlyStatsEl = document.querySelector<HTMLTableSectionElement>("#monthly-stats")!;
const ratioIncomeEl = document.querySelector<HTMLElement>("#ratio-income")!;
const ratioExpenseEl = document.querySelector<HTMLElement>("#ratio-expense")!;
const ratioLabelEl = document.querySelector<HTMLElement>("#ratio-label")!;

const errorDialog = document.querySelector<HTMLDialogElement>("#error-dialog")!;
const errorMessageEl = document.querySelector<HTMLElement>("#error-message")!;
const errorDialogClose = document.querySelector<HTMLButtonElement>("#error-dialog-close")!;

dateInput.valueAsDate = new Date();

// 카테고리/메모는 사용자 입력 그대로 innerHTML에 들어가므로 XSS 방지를 위해 이스케이프
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showError(message: string): void {
  errorMessageEl.textContent = message;
  errorDialog.showModal();
}

errorDialogClose.addEventListener("click", () => errorDialog.close());

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const showStats = btn.dataset.tab === "stats";
    ledgerView.hidden = showStats;
    statsView.hidden = !showStats;
  });
});

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

function categoryBarRow(item: CategoryTotal, max: number, type: TransactionType): string {
  const percent = (item.amount / max) * 100;
  return `
    <div class="stat-bar-row">
      <span>${escapeHtml(item.category)}</span>
      <div class="stat-bar-track"><div class="stat-bar-fill ${type}" style="width: ${percent}%"></div></div>
      <span class="amount ${type}">${currency.format(item.amount)}원</span>
    </div>
  `;
}

function renderStats(): void {
  const transactions = ledger.getTransactions();
  const expenseTotals = getCategoryTotals(transactions, "expense");
  const incomeTotals = getCategoryTotals(transactions, "income");
  const max = Math.max(1, ...expenseTotals.map((c) => c.amount), ...incomeTotals.map((c) => c.amount));

  categoryStatsEl.innerHTML =
    expenseTotals.map((c) => categoryBarRow(c, max, "expense")).join("") +
    incomeTotals.map((c) => categoryBarRow(c, max, "income")).join("");

  monthlyStatsEl.innerHTML = getMonthlyTotals(transactions)
    .map(
      (m) => `
        <tr>
          <td>${m.month}</td>
          <td class="amount income">+${currency.format(m.income)}원</td>
          <td class="amount expense">-${currency.format(m.expense)}원</td>
        </tr>
      `,
    )
    .join("");

  const { incomeRatio, expenseRatio } = getIncomeExpenseRatio(transactions);
  ratioIncomeEl.style.width = `${incomeRatio * 100}%`;
  ratioExpenseEl.style.width = `${expenseRatio * 100}%`;
  ratioLabelEl.textContent = `수입 ${Math.round(incomeRatio * 100)}% · 지출 ${Math.round(expenseRatio * 100)}%`;
}

function renderAll(): void {
  render();
  renderStats();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const type = typeInput.value as TransactionType;
  const isCustom = categorySelect.value === CUSTOM_CATEGORY;
  const category = (isCustom ? categoryCustomInput.value : categorySelect.value).trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  const validationError = validateTransactionInput({ category, amount, date });
  if (validationError) {
    showError(validationError);
    return;
  }

  const { saved } = ledger.addTransaction({ type, category, amount, date, memo: memoInput.value });
  if (!saved) showError("이 항목이 브라우저에 저장되지 못했습니다. 저장 공간을 확인해주세요.");

  if (isCustom && categorySaveCheckbox.checked) {
    const categorySaved = addCategory(type, category);
    if (!categorySaved) showError("카테고리가 브라우저에 저장되지 못했습니다. 저장 공간을 확인해주세요.");
  }
  refreshCategoryOptions();

  form.reset();
  dateInput.valueAsDate = new Date();
  renderAll();
});

listBody.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (!target.matches(".delete-btn")) return;
  const id = Number(target.dataset.id);
  const saved = ledger.removeTransaction(id);
  if (!saved) showError("삭제 내용이 브라우저에 저장되지 못했습니다. 저장 공간을 확인해주세요.");
  renderAll();
});

refreshCategoryOptions();
renderAll();

if (ledger.hadCorruptData) {
  showError("저장된 거래 데이터 일부가 손상되어 초기화되었습니다.");
}

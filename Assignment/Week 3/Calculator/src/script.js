const display = document.querySelector(".display");
const formula = document.querySelector(".formula");
const buttons = document.querySelectorAll(".button");

let firstNumber = "";
let operator = "";
let currentNumber = "0";
let shouldResetDisplay = false;

function updateDisplay() {
  display.textContent = currentNumber;
  formula.textContent = firstNumber && operator ? `${firstNumber} ${operator}` : "";
}

function inputNumber(number) {
  if (currentNumber === "0" || shouldResetDisplay) {
    currentNumber = number;
    shouldResetDisplay = false;
  } else {
    currentNumber += number;
  }

  updateDisplay();
}

function inputDecimal() {
  if (shouldResetDisplay) {
    currentNumber = "0";
    shouldResetDisplay = false;
  }

  if (!currentNumber.includes(".")) {
    currentNumber += ".";
  }

  updateDisplay();
}

function inputOperator(nextOperator) {
  if (firstNumber && operator && !shouldResetDisplay) {
    calculate();
  }

  firstNumber = currentNumber;
  operator = nextOperator;
  shouldResetDisplay = true;
  updateDisplay();
}

function calculate() {
  if (!firstNumber || !operator || shouldResetDisplay) {
    return;
  }

  const previous = parseFloat(firstNumber);
  const current = parseFloat(currentNumber);
  let result = 0;

  if (operator === "+") {
    result = previous + current;
  } else if (operator === "-") {
    result = previous - current;
  } else if (operator === "*") {
    result = previous * current;
  } else if (operator === "/") {
    if (current === 0) {
      currentNumber = "Error";
      firstNumber = "";
      operator = "";
      shouldResetDisplay = true;
      updateDisplay();
      return;
    }

    result = previous / current;
  }

  currentNumber = Number(result.toFixed(10)).toString();
  firstNumber = "";
  operator = "";
  shouldResetDisplay = true;
  updateDisplay();
}

function clearCalculator() {
  firstNumber = "";
  operator = "";
  currentNumber = "0";
  shouldResetDisplay = false;
  updateDisplay();
}

function handleButtonClick(event) {
  const button = event.currentTarget;
  const number = button.dataset.number;
  const nextOperator = button.dataset.operator;
  const action = button.dataset.action;

  if (number !== undefined) {
    inputNumber(number);
  } else if (nextOperator) {
    inputOperator(nextOperator);
  } else if (action === "decimal") {
    inputDecimal();
  } else if (action === "calculate") {
    calculate();
  } else if (action === "clear") {
    clearCalculator();
  }
}

buttons.forEach(function (button) {
  button.addEventListener("click", handleButtonClick);
});

updateDisplay();

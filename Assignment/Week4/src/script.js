// 화면에 보여 줄 할 일을 객체 배열로 관리합니다.
// 각 객체는 id, text, isDone 값을 가지고 있어서 삭제와 완료 체크를 구분해서 처리할 수 있습니다.
let todos = [
  { id: 1, text: "데베 강의", isDone: false },
  { id: 2, text: "머러 과제", isDone: false },
  { id: 3, text: "컴프 강의", isDone: false },
  { id: 4, text: "컴프 과제", isDone: false },
];

// 자주 사용하는 DOM 요소를 변수에 저장해 두면 같은 요소를 여러 번 찾지 않아도 됩니다.
const todoForm = document.querySelector("#todoForm");
const todoInput = document.querySelector("#todoInput");
const todoList = document.querySelector("#todoList");

// 새 할 일 id를 만들 때 사용합니다.
// Date.now()만 쓰면 아주 빠르게 추가할 때 id가 겹칠 수 있어서 숫자를 하나씩 올려 줍니다.
let nextTodoId = 5;

// 문자열 양쪽 공백을 지우고, 실제 글자가 있는지 검사하는 함수입니다.
// 같은 검사를 여러 곳에서 반복하지 않도록 함수로 분리했습니다.
function getCleanText(value) {
  return value.trim();
}

// todos 배열을 기준으로 화면을 새로 그립니다.
// HTML에 li를 직접 쓰지 않고, 배열을 forEach로 반복해서 li를 만듭니다.
function renderTodoList() {
  todoList.innerHTML = "";

  const list = document.createElement("ul");
  list.className = "items";

  if (todos.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "아직 추가된 할 일이 없어요.";
    todoList.append(emptyMessage);
    return;
  }

  todos.forEach(function (todo) {
    const item = document.createElement("li");
    item.className = "item";

    // 완료된 항목은 CSS에서 체크 표시와 취소선을 보여 주기 위해 클래스를 추가합니다.
    if (todo.isDone) {
      item.classList.add("is-done");
    }

    const checkButton = document.createElement("button");
    checkButton.className = "check-button";
    checkButton.type = "button";
    checkButton.setAttribute("aria-label", `${todo.text} 완료 상태 바꾸기`);

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = todo.text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "x";
    deleteButton.setAttribute("aria-label", `${todo.text} 삭제`);

    checkButton.addEventListener("click", function () {
      toggleTodo(todo.id);
    });

    deleteButton.addEventListener("click", function () {
      deleteTodo(todo.id);
    });

    item.append(checkButton, text, deleteButton);
    list.append(item);
  });

  todoList.append(list);
}

// 새 할 일을 추가하는 함수입니다.
// 배열 맨 뒤에 새 객체를 추가하고 다시 렌더링합니다.
function addTodo(text) {
  const newTodo = {
    id: nextTodoId,
    text: text,
    isDone: false,
  };

  nextTodoId += 1;
  todos = [...todos, newTodo];

  renderTodoList();
}

// 원 버튼을 누르면 완료 여부를 반대로 바꿉니다.
// map은 배열을 돌면서 새 배열을 만들어 주므로, 선택된 todo 객체만 바꿀 때 사용하기 좋습니다.
function toggleTodo(todoId) {
  todos = todos.map(function (todo) {
    if (todo.id !== todoId) {
      return todo;
    }

    return {
      ...todo,
      isDone: !todo.isDone,
    };
  });

  renderTodoList();
}

// 삭제 버튼을 누른 할 일만 todos 배열에서 제거합니다.
// filter는 조건을 통과한 요소만 남겨 새 배열을 만들어 주는 배열 메서드입니다.
function deleteTodo(todoId) {
  todos = todos.filter(function (todo) {
    return todo.id !== todoId;
  });

  renderTodoList();
}

// form submit 이벤트를 사용하면 추가 버튼 클릭과 Enter 입력을 한 번에 처리할 수 있습니다.
todoForm.addEventListener("submit", function (event) {
  // form은 기본적으로 페이지를 새로고침하려고 하므로, JS로 처리하기 위해 막아 줍니다.
  event.preventDefault();

  const text = getCleanText(todoInput.value);

  // 빈 문자열은 할 일로 추가하지 않습니다.
  if (text === "") {
    todoInput.focus();
    return;
  }

  addTodo(text);
  todoInput.value = "";
  todoInput.focus();
});

// 페이지가 처음 열렸을 때 한 번 렌더링해서 초기 목록을 보여 줍니다.
renderTodoList();

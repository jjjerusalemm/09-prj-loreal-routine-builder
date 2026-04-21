/* Get references to DOM elements */
const WORKER_URL = "https://lorealsmartroutine.jtut.workers.dev";
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatInput = document.getElementById("chatInput");
const clearAllBtn = document.getElementById("clearAll");

/* Array to hold selected products */
let selectedProducts = [];
let allProducts = []; // Store all products for easy access

/* Array to hold conversation messages */
let messages = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length === 0) {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
    // Load saved selections after products are loaded
    loadSelectedProducts();
  }
  return allProducts;
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  const selectedIds = selectedProducts.map((product) => product.id);
  localStorage.setItem("loreal-selected-products", JSON.stringify(selectedIds));
}

/* Load selected products from localStorage */
function loadSelectedProducts() {
  const savedIds = localStorage.getItem("loreal-selected-products");
  if (savedIds) {
    const ids = JSON.parse(savedIds);
    selectedProducts = allProducts.filter((product) =>
      ids.includes(product.id),
    );
    updateSelectedProductsList();
  }
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="details-btn">Details</button>
        <div class="product-description" style="display: none;">${product.description}</div>
      </div>
    </div>
  `,
    )
    .join("");

  // Apply selected class to already selected products
  products.forEach((product) => {
    if (selectedProducts.some((p) => p.id === product.id)) {
      const card = productsContainer.querySelector(`[data-id="${product.id}"]`);
      if (card) card.classList.add("selected");
    }
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

/* Handle product card clicks for selection */
productsContainer.addEventListener("click", (e) => {
  // Handle details button clicks
  if (e.target.classList.contains("details-btn")) {
    e.stopPropagation();
    const card = e.target.closest(".product-card");
    const desc = card.querySelector(".product-description");
    desc.style.display = desc.style.display === "none" ? "block" : "none";
    return;
  }

  const card = e.target.closest(".product-card");
  if (!card) return;

  const productId = parseInt(card.dataset.id);
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const isSelected = card.classList.contains("selected");

  if (isSelected) {
    // Remove from selected
    card.classList.remove("selected");
    selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  } else {
    // Add to selected
    card.classList.add("selected");
    selectedProducts.push(product);
  }

  updateSelectedProductsList();
  saveSelectedProducts();
});

/* Update the selected products list */
function updateSelectedProductsList() {
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
    <div class="selected-product" data-id="${product.id}">
      <span>${product.name} by ${product.brand}</span>
      <button class="remove-btn" data-id="${product.id}">Remove</button>
    </div>
  `,
    )
    .join("");
}

/* Handle remove button clicks */
selectedProductsList.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const productId = parseInt(e.target.dataset.id);
    selectedProducts = selectedProducts.filter((p) => p.id !== productId);
    updateSelectedProductsList();
    saveSelectedProducts();
    // Also remove selected class from the card if visible
    const card = productsContainer.querySelector(`[data-id="${productId}"]`);
    if (card) card.classList.remove("selected");
  }
});

/* Generate routine using selected products */
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = "Please select some products first.";
    return;
  }

  // Prepare the user message with selected products
  const productList = selectedProducts
    .map(
      (product) =>
        `${product.name} by ${product.brand}: ${product.description}`,
    )
    .join("\n");
  const userMessage = `Generate a skincare routine using these selected products:\n${productList}`;

  // Add user message to conversation history
  messages.push({ role: "user", content: userMessage });

  // Show loading message
  chatWindow.innerHTML = "Generating your routine...";

  try {
    // Send request to Cloudflare Worker endpoint
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add assistant response to conversation history
    messages.push({ role: "assistant", content: aiResponse });

    // Display the conversation in chat window
    chatWindow.innerHTML = messages
      .map(
        (message) =>
          `<div class="message ${message.role}"><strong>${
            message.role === "user" ? "You" : "AI"
          }:</strong> ${message.content}</div>`,
      )
      .join("");
  } catch (error) {
    chatWindow.innerHTML = `Error generating routine: ${error.message}`;
  }
}

/* Chat form submission handler for follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userQuestion = chatInput.value.trim();
  if (!userQuestion) return;

  // Validate that the question is related to allowed topics
  const allowedTopics = [
    "skincare",
    "haircare",
    "makeup",
    "fragrance",
    "routine",
  ];
  const isRelated =
    allowedTopics.some((topic) => userQuestion.toLowerCase().includes(topic)) ||
    messages.length > 0; // Allow if there's already a conversation (generated routine)

  if (!isRelated) {
    chatWindow.innerHTML =
      "Please ask questions related to skincare, haircare, makeup, fragrance, or your generated routine.";
    chatInput.value = "";
    return;
  }

  // Add user message to conversation history
  messages.push({ role: "user", content: userQuestion });

  // Clear input
  chatInput.value = "";

  // Show loading message
  chatWindow.innerHTML = "Thinking...";

  try {
    // Send request to Cloudflare Worker endpoint with full conversation history
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add assistant response to conversation history
    messages.push({ role: "assistant", content: aiResponse });

    // Display the response in chat window
    chatWindow.innerHTML = aiResponse;
  } catch (error) {
    chatWindow.innerHTML = `Error: ${error.message}`;
  }
});

/* Generate routine button handler */
generateBtn.addEventListener("click", generateRoutine);

/* Clear all selected products handler */
clearAllBtn.addEventListener("click", () => {
  // Empty the selected products array
  selectedProducts = [];

  // Update the UI
  updateSelectedProductsList();

  // Clear localStorage
  saveSelectedProducts();

  // Remove selected class from all product cards
  const selectedCards = productsContainer.querySelectorAll(
    ".product-card.selected",
  );
  selectedCards.forEach((card) => card.classList.remove("selected"));
});

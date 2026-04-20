/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Array to hold selected products */
let selectedProducts = [];
let allProducts = []; // Store all products for easy access

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
  }
  return allProducts;
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
    // Also remove selected class from the card if visible
    const card = productsContainer.querySelector(`[data-id="${productId}"]`);
    if (card) card.classList.remove("selected");
  }
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

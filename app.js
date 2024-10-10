let reactions = [];
let editingReactionId = null;

// Function to set the default date and time
function setDefaultDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is zero-based
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // Format: YYYY-MM-DDTHH:MM
  const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
  document.getElementById('reactionDate').value = localDateTime;
}

function fetchProductData() {
  const barcode = document.getElementById('barcode').value.trim();
  if (!barcode) {
    alert("Please enter a valid barcode.");
    return;
  }

  const apiUrl = `https://world.openfoodfacts.org/api/v3/product/${barcode}.json`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (data.product) {
        document.getElementById('product').value = data.product.product_name || 'Unknown Product';
        const ingredientsList = data.product.ingredients ? data.product.ingredients.map(i => i.text).join(', ') : '';
        document.getElementById('ingredients').value = ingredientsList;

        if (data.product.image_url) {
          document.getElementById('productImage').src = data.product.image_url;
          document.getElementById('productImage').style.display = 'block';
          document.getElementById('noImageText').style.display = 'none';
        } else {
          document.getElementById('productImage').style.display = 'none';
          document.getElementById('noImageText').style.display = 'block';
        }
      } else {
        alert("Product not found.");
      }
    })
    .catch(error => {
      console.error("Error fetching product data:", error);
    });
}

function addOrUpdateReaction() {
  const productInput = document.getElementById('product').value.trim();
  const ingredientsInput = document.getElementById('ingredients').value.trim();
  const severityInput = document.getElementById('severity').value.trim();
  const notesInput = document.getElementById('notes').value.trim();
  const reactionDateInput = document.getElementById('reactionDate').value;

  if (!productInput || !ingredientsInput || !severityInput || !reactionDateInput) {
    alert("Please complete all fields.");
    return;
  }

  const reactionData = {
    product: productInput,
    ingredients: [...new Set(ingredientsInput.split(',').map(i => i.trim().toLowerCase()))], // Ensure unique ingredients within a product
    severity: parseInt(severityInput),
    notes: notesInput,
    dateTime: new Date(reactionDateInput).toLocaleString(),
  };

  if (editingReactionId !== null) {
    reactions[editingReactionId] = reactionData;
    editingReactionId = null;
  } else {
    reactions.push(reactionData);
  }

  displayReactions();
  findDuplicatedIngredients();
  
  // Clear the form after saving the reaction
  clearForm();
}

function displayReactions() {
  const tableBody = document.querySelector("#reactionTable tbody");
  tableBody.innerHTML = '';

  reactions.forEach((reaction, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${reaction.product}</td>
      <td>${reaction.ingredients.join(', ')}</td>
      <td>${reaction.severity}</td>
      <td>${reaction.notes}</td>
      <td>${reaction.dateTime}</td>
      <td>
        <button onclick="editReaction(${index})">Edit</button>
        <button onclick="deleteReaction(${index})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function editReaction(index) {
  const reaction = reactions[index];
  document.getElementById('product').value = reaction.product;
  document.getElementById('ingredients').value = reaction.ingredients.join(', ');
  document.getElementById('severity').value = reaction.severity;
  document.getElementById('notes').value = reaction.notes;
  document.getElementById('reactionDate').value = new Date(reaction.dateTime).toISOString().slice(0, 16);
  editingReactionId = index;
}

function deleteReaction(index) {
  reactions.splice(index, 1);
  displayReactions();
  findDuplicatedIngredients();
}

function clearForm() {
  document.getElementById('product').value = '';
  document.getElementById('ingredients').value = '';
  document.getElementById('severity').value = '5';
  document.getElementById('notes').value = 'Describe the symptoms or reaction';
  setDefaultDateTime();
  document.getElementById('productImage').style.display = 'none';
  document.getElementById('noImageText').style.display = 'none';
}

function toggleReactionsTable() {
  const reactionList = document.getElementById('reactionList');
  if (reactionList.style.display === 'none') {
    reactionList.style.display = 'block';
  } else {
    reactionList.style.display = 'none';
  }
}

// Function to find and display only duplicated ingredients across different reactions
function findDuplicatedIngredients() {
  let ingredientCount = {};

  // Only count ingredients if they appear in more than one reaction
  if (reactions.length > 1) {
    // Loop through all reactions to count ingredient occurrences, only count each ingredient once per product
    reactions.forEach(reaction => {
      const uniqueIngredients = [...new Set(reaction.ingredients)];
      uniqueIngredients.forEach(ingredient => {
        if (ingredientCount[ingredient]) {
          ingredientCount[ingredient]++;
        } else {
          ingredientCount[ingredient] = 1;
        }
      });
    });
  }

  // Filter ingredients that appear more than once across different reactions
  const duplicatedIngredients = Object.keys(ingredientCount).filter(ingredient => ingredientCount[ingredient] > 1);

  // Display the duplicated ingredients
  const commonIngredientsList = document.getElementById('commonIngredientsList');
  commonIngredientsList.innerHTML = ''; // Clear the previous list

  if (duplicatedIngredients.length > 0) {
    duplicatedIngredients.forEach(ingredient => {
      const listItem = document.createElement('li');
      listItem.textContent = ingredient;
      commonIngredientsList.appendChild(listItem);
    });
    document.getElementById('commonIngredients').style.display = 'block';
  } else {
    document.getElementById('commonIngredients').style.display = 'none';
  }
}

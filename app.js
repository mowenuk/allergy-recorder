let reactions = [];
let editingReactionId = null;

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
        const ingredientsList = data.product.ingredients.map(i => i.text).join(', ');
        document.getElementById('ingredients').value = ingredientsList;
        if (data.product.image_url) {
          document.getElementById('productImage').src = data.product.image_url;
          document.getElementById('productImage').style.display = 'block';
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
    ingredients: ingredientsInput.split(',').map(i => i.trim().toLowerCase()),
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

  clearForm();
  displayReactions();
  findCommonIngredients(reactionData.ingredients);
}

// Function to display all reactions
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

// Function to edit a reaction
function editReaction(index) {
  const reaction = reactions[index];
  document.getElementById('product').value = reaction.product;
  document.getElementById('ingredients').value = reaction.ingredients.join(', ');
  document.getElementById('severity').value = reaction.severity;
  document.getElementById('notes').value = reaction.notes;
  document.getElementById('reactionDate').value = new Date(reaction.dateTime).toISOString().slice(0, 16);
  editingReactionId = index;
}

// Function to delete a reaction
function deleteReaction(index) {
  reactions.splice(index, 1);
  displayReactions();
}

// Function to clear the form fields
function clearForm() {
  document.getElementById('product').value = '';
  document.getElementById('ingredients').value = '';
  document.getElementById('severity').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('reactionDate').value = '';
}

// Function to find and display common ingredients that appeared in previous reactions
function findCommonIngredients(newIngredients) {
  let commonIngredients = [];

  // Loop through previous reactions to find common ingredients
  reactions.forEach(reaction => {
    reaction.ingredients.forEach(ingredient => {
      if (newIngredients.includes(ingredient)) {
        commonIngredients.push(ingredient);
      }
    });
  });

  // Display common ingredients
  const commonIngredientsList = document.getElementById('commonIngredientsList');
  commonIngredientsList.innerHTML = ''; // Clear the previous list

  if (commonIngredients.length > 0) {
    const uniqueCommonIngredients = [...new Set(commonIngredients)]; // Remove duplicates
    uniqueCommonIngredients.forEach(ingredient => {
      const listItem = document.createElement('li');
      listItem.textContent = ingredient;
      commonIngredientsList.appendChild(listItem);
    });
    document.getElementById('commonIngredients').style.display = 'block';
  } else {
    document.getElementById('commonIngredients').style.display = 'none';
  }
}

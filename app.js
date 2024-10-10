import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let reactions = [];
let editingReactionId = null;
let db;
let userId = null;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAg9cTGFnhnKUf4VqzTIl9OEQT8qgliQcw",
  authDomain: "allergytracker-f8d9f.firebaseapp.com",
  projectId: "allergytracker-f8d9f",
  storageBucket: "allergytracker-f8d9f.appspot.com",
  messagingSenderId: "155088881087",
  appId: "1:155088881087:web:88a6fea927f66154010d0a",
  measurementId: "G-0QT3LSY4EL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
db = getFirestore(app);

// Sign in anonymously
signInAnonymously(auth)
  .then((userCredential) => {
    userId = userCredential.user.uid;
    loadReactions();
  })
  .catch((error) => {
    console.error("Error signing in anonymously:", error);
  });

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

async function addOrUpdateReaction() {
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
    userId: userId,
    product: productInput,
    ingredients: [...new Set(ingredientsInput.split(',').map(i => i.trim().toLowerCase()))], // Ensure unique ingredients within a product
    severity: parseInt(severityInput),
    notes: notesInput,
    dateTime: new Date(reactionDateInput).toLocaleString(),
  };

  if (editingReactionId !== null) {
    const reactionDoc = doc(db, "reactions", editingReactionId);
    await updateDoc(reactionDoc, reactionData);
    editingReactionId = null;
  } else {
    await addDoc(collection(db, "reactions"), reactionData);
  }

  loadReactions();
  clearForm();
}

async function loadReactions() {
  try {
    const querySnapshot = await getDocs(collection(db, "reactions"));
    reactions = [];

    querySnapshot.forEach((doc) => {
      if (doc.data().userId === userId) {
        reactions.push({ id: doc.id, ...doc.data() });
      }
    });

    displayReactions();
    findDuplicatedIngredients();
  } catch (error) {
    console.error("Error loading reactions from the database:", error);
  }
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
        <button onclick="editReaction('${reaction.id}')">Edit</button>
        <button onclick="deleteReaction('${reaction.id}')">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function editReaction(reactionId) {
  const reaction = reactions.find(r => r.id === reactionId);
  document.getElementById('product').value = reaction.product;
  document.getElementById('ingredients').value = reaction.ingredients.join(', ');
  document.getElementById('severity').value = reaction.severity;
  document.getElementById('notes').value = reaction.notes;
  document.getElementById('reactionDate').value = new Date(reaction.dateTime).toISOString().slice(0, 16);
  editingReactionId = reactionId;
}

async function deleteReaction(reactionId) {
  try {
    await deleteDoc(doc(db, "reactions", reactionId));
    loadReactions();
  } catch (error) {
    console.error("Error deleting reaction:", error);
  }
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

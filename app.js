let pdfDoc = null;
let currentPage = 1;
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const definitionBox = document.getElementById('definitionBox');

// Sign in anonymously
auth.signInAnonymously().catch(error => {
  console.error("Authentication error:", error);
});

// Handle file upload
document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onload = function() {
      const typedarray = new Uint8Array(this.result);
      renderPDF(typedarray);
      uploadFile(file);
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert("Please upload a valid PDF file.");
  }
});

// Upload file to Firebase Storage
function uploadFile(file) {
  const userId = auth.currentUser.uid;
  const storageRef = storage.ref(`${userId}/${file.name}`);
  storageRef.put(file).then(() => {
    console.log("File uploaded successfully.");
    db.collection('users').doc(userId).collection('pdfs').add({
      name: file.name,
      path: `${userId}/${file.name}`,
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).catch(error => {
    console.error("Upload error:", error);
  });
}

// Render PDF
function renderPDF(data) {
  const loadingTask = pdfjsLib.getDocument({ data: data });
  loadingTask.promise.then(pdf => {
    pdfDoc = pdf;
    renderPage(currentPage);
  }).catch(error => {
    console.error("Error loading PDF:", error);
  });
}

// Render specific page
function renderPage(num) {
  pdfDoc.getPage(num).then(page => {
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    page.render(renderContext);
  });
}

// Fetch word definition
function fetchDefinition(word) {
  fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
    .then(response => response.json())
    .then(data => {
      if (data[0]) {
        const definition = data[0].meanings[0].definitions[0].definition;
        definitionBox.textContent = `Definition of "${word}": ${definition}`;
      } else {
        definitionBox.textContent = `No definition found for "${word}".`;
      }
    })
    .catch(error => {
      console.error("Error fetching definition:", error);
    });
}

// Handle text selection
canvas.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  if (selectedText) {
    fetchDefinition(selectedText);
    saveHighlight(selectedText);
  }
});

// Save highlight to Firestore
function saveHighlight(text) {
  const userId = auth.currentUser.uid;
  db.collection('users').doc(userId).collection('highlights').add({
    text: text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    console.log("Highlight saved.");
  }).catch(error => {
    console.error("Error saving highlight:", error);
  });
}

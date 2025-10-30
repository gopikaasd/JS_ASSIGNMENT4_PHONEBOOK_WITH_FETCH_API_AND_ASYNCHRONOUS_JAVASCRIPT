// API for fetching user data
const API_URL = 'https://jsonplaceholder.typicode.com/users';

// DOM element references
const contactForm = document.getElementById('contactForm');
const contactsList = document.getElementById('contactsList');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const validationSummary = document.getElementById('validationSummary');
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
const editModal = document.getElementById('editModal');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEdit = document.getElementById('cancelEdit');
const editForm = document.getElementById('editForm');

// Global state variables
let contacts = []; // Stores all contacts
let contactToDelete = null; // Tracks contact to be deleted
let filteredContacts = []; // Stores filtered contacts for search
let nextId = 10001; // High starting ID to avoid conflicts with API data

// Validation patterns for form fields
const validationPatterns = {
    name: /^[a-zA-Z\s]{2,50}$/, // Letters and spaces, 2-50 characters
    phone: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,4}$/, // Various phone formats
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ // Standard email format
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadContacts();
    setupEventListeners();
});

// Set up all event listeners for user interactions
function setupEventListeners() {
    // Form submission handlers
    contactForm.addEventListener('submit', handleAddContact);
    editForm.addEventListener('submit', handleUpdateContact);

    // Search functionality handlers
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    searchInput.addEventListener('input', handleSearch); // Real-time search

    // Real-time field validation for main form
    document.getElementById('name').addEventListener('input', () => validateField('name'));
    document.getElementById('phone').addEventListener('input', () => validateField('phone'));
    document.getElementById('email').addEventListener('input', () => validateField('email'));

    // Real-time field validation for edit form
    document.getElementById('editName').addEventListener('input', () => validateField('editName'));
    document.getElementById('editPhone').addEventListener('input', () => validateField('editPhone'));
    document.getElementById('editEmail').addEventListener('input', () => validateField('editEmail'));

    // Delete modal event handlers
    closeDeleteModal.addEventListener('click', () => deleteModal.style.display = 'none');
    cancelDelete.addEventListener('click', () => deleteModal.style.display = 'none');
    confirmDelete.addEventListener('click', handleDeleteContact);

    // Edit modal event handlers
    closeEditModal.addEventListener('click', closeEditModalHandler);
    cancelEdit.addEventListener('click', closeEditModalHandler);

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === deleteModal) deleteModal.style.display = 'none';
        if (e.target === editModal) closeEditModalHandler();
    });
}

// Close edit modal and clear validation states
function closeEditModalHandler() {
    editModal.style.display = 'none';
    clearValidation();
}

// Validate individual form fields
function validateField(fieldId) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}Error`);
    const value = input.value.trim();
    
    // Determine field type (remove 'edit' prefix if present)
    let fieldType = fieldId.replace('edit', '').toLowerCase();
    
    // Name validation
    if (fieldType === 'name') {
        if (!value) {
            return showFieldError(input, errorElement, 'Name is required');
        }
        if (!validationPatterns.name.test(value)) {
            return showFieldError(input, errorElement, 'Name must contain only letters and spaces (2-50 characters)');
        }
    }
    
    // Phone validation
    if (fieldType === 'phone') {
        if (!value) {
            return showFieldError(input, errorElement, 'Phone number is required');
        }
        if (!validationPatterns.phone.test(value)) {
            return showFieldError(input, errorElement, 'Please enter a valid phone number (e.g., 123-456-7890, (123) 456-7890, or +1-123-456-7890)');
        }
    }
    
    // Email validation (optional field)
    if (fieldType === 'email') {
        if (value && !validationPatterns.email.test(value)) {
            return showFieldError(input, errorElement, 'Please enter a valid email address (e.g., user@example.com)');
        }
    }
    
    // Show success state if validation passes
    showFieldSuccess(input, errorElement);
    return true;
}

// Display field error state and message
function showFieldError(input, errorElement, message) {
    input.classList.remove('input-success');
    input.classList.add('input-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    return false;
}

// Display field success state
function showFieldSuccess(input, errorElement) {
    input.classList.remove('input-error');
    input.classList.add('input-success');
    errorElement.style.display = 'none';
    return true;
}

// Clear all validation states and messages
function clearValidation() {
    // Hide all error messages
    const errorElements = document.querySelectorAll('.validation-error');
    errorElements.forEach(element => {
        element.style.display = 'none';
    });
    
    // Remove validation styling from inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.classList.remove('input-error', 'input-success');
    });
    
    // Hide validation summary
    validationSummary.style.display = 'none';
}

// Load contacts from API
async function loadContacts() {
    try {
        showLoading();
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch contacts: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform API data to match our contact structure
        contacts = data.map(user => ({
            id: user.id,
            name: user.name,
            phone: user.phone.split(' ')[0], // Take only first phone number
            email: user.email,
            isApiData: true // Flag to identify API-sourced contacts
        }));
        
        // Set nextId to avoid conflicts with API IDs
        nextId = Math.max(...contacts.map(c => c.id)) + 1;
        
        // Initialize filtered contacts
        filteredContacts = [...contacts];
        renderContacts();
    } catch (error) {
        showError('Failed to load contacts. Please try again later.');
        console.error('Error loading contacts:', error);
        contactsList.innerHTML = '<div class="no-contacts">Failed to load contacts. You can still add new contacts.</div>';
    }
}

// Render contacts to the DOM
function renderContacts() {
    if (filteredContacts.length === 0) {
        contactsList.innerHTML = '<div class="no-contacts">No contacts found. Add some contacts to get started!</div>';
        return;
    }
    
    // Generate HTML for each contact
    contactsList.innerHTML = filteredContacts.map(contact => `
        <div class="contact-item" data-id="${contact.id}">
            <div class="contact-info">
                <h3>${escapeHtml(contact.name)} 
                   
                </h3>
                <p>📞 ${escapeHtml(contact.phone)}</p>
                <p>📧 ${escapeHtml(contact.email)}</p>
            </div>
            <div class="contact-actions">
                <button class="btn btn-edit edit-btn" data-id="${contact.id}">Edit</button>
                <button class="btn btn-danger delete-btn" data-id="${contact.id}">Delete</button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            openEditModal(id);
        });
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            openDeleteModal(id);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show loading state
function showLoading() {
    contactsList.innerHTML = '<div class="loading">Loading contacts...</div>';
}

// Handle adding new contact
async function handleAddContact(e) {
    e.preventDefault();
    
    clearValidation();
    
    // Validate all fields
    const isNameValid = validateField('name');
    const isPhoneValid = validateField('phone');
    const isEmailValid = validateField('email');
    
    if (!isNameValid || !isPhoneValid || !isEmailValid) {
        validationSummary.textContent = 'Please fix the validation errors before submitting.';
        validationSummary.style.display = 'block';
        return;
    }
    
    // Get form values
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    
    // Check for duplicate phone number
    const phoneExists = contacts.some(c => c.phone === phone);
    if (phoneExists) {
        showError('A contact with this phone number already exists!');
        return;
    }
    
    // Check for duplicate email (if provided)
    if (email) {
        const emailExists = contacts.some(c => c.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
            showError('A contact with this email address already exists!');
            return;
        }
    }
    
    try {
        // Create new contact object
        const newContact = {
            id: nextId++,
            name,
            phone,
            email: email || 'N/A',
            isApiData: false
        };
        
        // For local contacts, we don't need to make an API call
        // Just update the local state
        contacts.push(newContact);
        filteredContacts = [...contacts];
        
        contactForm.reset();
        clearValidation();
        renderContacts();
        showSuccess('✅ Contact added successfully!');
        
    } catch (error) {
        showError('Failed to add contact. Please try again.');
        console.error('Error adding contact:', error);
    }
}

// Handle updating existing contact
async function handleUpdateContact(e) {
    e.preventDefault();
    
    clearValidation();
    
    // Validate all edit form fields
    const isNameValid = validateField('editName');
    const isPhoneValid = validateField('editPhone');
    const isEmailValid = validateField('editEmail');
    
    if (!isNameValid || !isPhoneValid || !isEmailValid) {
        validationSummary.textContent = 'Please fix the validation errors before submitting.';
        validationSummary.style.display = 'block';
        return;
    }
    
    const id = parseInt(document.getElementById('editId').value);
    const name = document.getElementById('editName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    
    // Check for duplicate phone (excluding current contact)
    const phoneExists = contacts.some(c => c.phone === phone && c.id !== id);
    if (phoneExists) {
        showError('A contact with this phone number already exists!');
        return;
    }
    
    // Check for duplicate email (excluding current contact)
    if (email) {
        const emailExists = contacts.some(c => c.email.toLowerCase() === email.toLowerCase() && c.id !== id);
        if (emailExists) {
            showError('A contact with this email address already exists!');
            return;
        }
    }
    
    try {
        const contactIndex = contacts.findIndex(contact => contact.id === id);
        
        if (contactIndex === -1) {
            showError('Contact not found.');
            return;
        }
        
        const contact = contacts[contactIndex];
        const updatedContact = {
            ...contact,
            name,
            phone,
            email: email || 'N/A'
        };
        
        // For API contacts, we simulate the update
        // For local contacts, we just update directly
        if (contact.isApiData) {
            // Simulate API PUT request for API contacts
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedContact),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update contact: ${response.status}`);
            }
        }
        
        // Update local state for both API and local contacts
        contacts[contactIndex] = updatedContact;
        
        const filteredIndex = filteredContacts.findIndex(contact => contact.id === id);
        if (filteredIndex !== -1) {
            filteredContacts[filteredIndex] = updatedContact;
        }
        
        editModal.style.display = 'none';
        clearValidation();
        renderContacts();
        showSuccess('✅ Contact updated successfully!');
        
    } catch (error) {
        showError('Failed to update contact. Please try again.');
        console.error('Error updating contact:', error);
    }
}

// Handle contact deletion
async function handleDeleteContact() {
    if (!contactToDelete) return;
    
    try {
        const contact = contacts.find(c => c.id === contactToDelete);
        
        if (contact && contact.isApiData) {
            // Simulate API DELETE request for API contacts
            const response = await fetch(`${API_URL}/${contactToDelete}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete contact: ${response.status}`);
            }
        }
        
        // Update local state for both API and local contacts
        contacts = contacts.filter(contact => contact.id !== contactToDelete);
        filteredContacts = filteredContacts.filter(contact => contact.id !== contactToDelete);
        
        deleteModal.style.display = 'none';
        renderContacts();
        showSuccess('✅ Contact deleted successfully!');
        contactToDelete = null;
        
    } catch (error) {
        showError('Failed to delete contact. Please try again.');
        console.error('Error deleting contact:', error);
    }
}

// Handle contact search
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        // Show all contacts if search is empty
        filteredContacts = [...contacts];
    } else {
        // Filter contacts based on search query - FIXED: Phone numbers now also converted to lowercase
        filteredContacts = contacts.filter(contact => 
            contact.name.toLowerCase().includes(query) || 
            contact.phone.toLowerCase().includes(query) ||
            (contact.email && contact.email.toLowerCase().includes(query))
        );
    }
    
    renderContacts();
}

// Open delete confirmation modal
function openDeleteModal(id) {
    contactToDelete = id;
    deleteModal.style.display = 'flex';
}

// Open edit modal with contact data
function openEditModal(id) {
    const contact = contacts.find(contact => contact.id === id);
    
    if (!contact) {
        showError('Contact not found.');
        return;
    }
    
    document.getElementById('editId').value = contact.id;
    document.getElementById('editName').value = contact.name;
    document.getElementById('editPhone').value = contact.phone;
    document.getElementById('editEmail').value = contact.email === 'N/A' ? '' : contact.email;
    
    clearValidation();
    editModal.style.display = 'flex';
}

// Display error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Display success message
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}
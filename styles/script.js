 const API_URL = 'https://jsonplaceholder.typicode.com/users';

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

        let contacts = [];
        let contactToDelete = null;
        let filteredContacts = [];
        let nextId = 10001; // Start with a high number to avoid conflicts with API data

        const validationPatterns = {
            name: /^[a-zA-Z\s]{2,50}$/,
            phone: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,4}$/,
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        };

        document.addEventListener('DOMContentLoaded', () => {
            loadContacts();
            setupEventListeners();
        });

        function setupEventListeners() {
            contactForm.addEventListener('submit', handleAddContact);
            searchBtn.addEventListener('click', handleSearch);
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') handleSearch();
            });
            searchInput.addEventListener('input', handleSearch);
            
            document.getElementById('name').addEventListener('input', () => validateField('name'));
            document.getElementById('phone').addEventListener('input', () => validateField('phone'));
            document.getElementById('email').addEventListener('input', () => validateField('email'));
            
            document.getElementById('editName').addEventListener('input', () => validateField('editName'));
            document.getElementById('editPhone').addEventListener('input', () => validateField('editPhone'));
            document.getElementById('editEmail').addEventListener('input', () => validateField('editEmail'));
            
            closeDeleteModal.addEventListener('click', () => deleteModal.style.display = 'none');
            cancelDelete.addEventListener('click', () => deleteModal.style.display = 'none');
            confirmDelete.addEventListener('click', handleDeleteContact);
            
            closeEditModal.addEventListener('click', closeEditModalHandler);
            cancelEdit.addEventListener('click', closeEditModalHandler);
            editForm.addEventListener('submit', handleUpdateContact);
            
            window.addEventListener('click', (e) => {
                if (e.target === deleteModal) deleteModal.style.display = 'none';
                if (e.target === editModal) closeEditModalHandler();
            });
        }

        function closeEditModalHandler() {
            editModal.style.display = 'none';
            clearValidation();
        }

        function validateField(fieldId) {
            const input = document.getElementById(fieldId);
            const errorElement = document.getElementById(`${fieldId}Error`);
            const value = input.value.trim();
            
            let fieldType = fieldId.replace('edit', '').toLowerCase();
            
            if (fieldType === 'name') {
                if (!value) {
                    return showFieldError(input, errorElement, 'Name is required');
                }
                if (!validationPatterns.name.test(value)) {
                    return showFieldError(input, errorElement, 'Name must contain only letters and spaces (2-50 characters)');
                }
            }
            
            if (fieldType === 'phone') {
                if (!value) {
                    return showFieldError(input, errorElement, 'Phone number is required');
                }
                if (!validationPatterns.phone.test(value)) {
                    return showFieldError(input, errorElement, 'Please enter a valid phone number (e.g., 123-456-7890, (123) 456-7890, or +1-123-456-7890)');
                }
            }
            
            if (fieldType === 'email') {
                if (value && !validationPatterns.email.test(value)) {
                    return showFieldError(input, errorElement, 'Please enter a valid email address (e.g., user@example.com)');
                }
            }
            
            showFieldSuccess(input, errorElement);
            return true;
        }
        
        function showFieldError(input, errorElement, message) {
            input.classList.remove('input-success');
            input.classList.add('input-error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            return false;
        }
        
        function showFieldSuccess(input, errorElement) {
            input.classList.remove('input-error');
            input.classList.add('input-success');
            errorElement.style.display = 'none';
            return true;
        }
        
        function clearValidation() {
            const errorElements = document.querySelectorAll('.validation-error');
            errorElements.forEach(element => {
                element.style.display = 'none';
            });
            
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                input.classList.remove('input-error', 'input-success');
            });
            
            validationSummary.style.display = 'none';
        }

        async function loadContacts() {
            try {
                showLoading();
                const response = await fetch(API_URL);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch contacts: ${response.status}`);
                }
                
                const data = await response.json();
                
                contacts = data.map(user => ({
                    id: user.id,
                    name: user.name,
                    phone: user.phone.split(' ')[0],
                    email: user.email,
                  
                    isApiData: true
                }));
                
                nextId = Math.max(...contacts.map(c => c.id)) + 1;
                
                filteredContacts = [...contacts];
                renderContacts();
            } catch (error) {
                showError('Failed to load contacts. Please try again later.');
                console.error('Error loading contacts:', error);
                contactsList.innerHTML = '<div class="no-contacts">Failed to load contacts. You can still add new contacts.</div>';
            }
        }

        function renderContacts() {
            if (filteredContacts.length === 0) {
                contactsList.innerHTML = '<div class="no-contacts">No contacts found. Add some contacts to get started!</div>';
                return;
            }
            
            contactsList.innerHTML = filteredContacts.map(contact => `
                <div class="contact-item" data-id="${contact.id}">
                    <div class="contact-info">
                        <h3>${escapeHtml(contact.name)}</h3>
                        <p>📞 ${escapeHtml(contact.phone)}</p>
                        <p>📧 ${escapeHtml(contact.email)}</p>
                      
                    </div>
                    <div class="contact-actions">
                        <button class="btn btn-secondary edit-btn" data-id="${contact.id}">Edit</button>
                        <button class="btn btn-danger delete-btn" data-id="${contact.id}">Delete</button>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.getAttribute('data-id'));
                    openEditModal(id);
                });
            });
            
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

        function showLoading() {
            contactsList.innerHTML = '<div class="loading">Loading contacts...</div>';
        }

        async function handleAddContact(e) {
            e.preventDefault();
            
            clearValidation();
            
            const isNameValid = validateField('name');
            const isPhoneValid = validateField('phone');
            const isEmailValid = validateField('email');
            
            if (!isNameValid || !isPhoneValid || !isEmailValid) {
                validationSummary.textContent = 'Please fix the validation errors before submitting.';
                validationSummary.style.display = 'block';
                return;
            }
            
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
         
            
            const phoneExists = contacts.some(c => c.phone === phone);
            if (phoneExists) {
                showError('A contact with this phone number already exists!');
                return;
            }
            
            if (email) {
                const emailExists = contacts.some(c => c.email.toLowerCase() === email.toLowerCase());
                if (emailExists) {
                    showError('A contact with this email address already exists!');
                    return;
                }
            }
            
            try {
                const newContact = {
                    id: nextId++,
                    name,
                    phone,
                    email: email || 'N/A',
                  
                    isApiData: false
                };
                
                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(newContact),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to add contact: ${response.status}`);
                }
                
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

        async function handleUpdateContact(e) {
            e.preventDefault();
            
            clearValidation();
            
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
          
            
            const phoneExists = contacts.some(c => c.phone === phone && c.id !== id);
            if (phoneExists) {
                showError('A contact with this phone number already exists!');
                return;
            }
            
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
                
                const updatedContact = {
                    ...contacts[contactIndex],
                    name,
                    phone,
                    email: email || 'N/A'
               
                };
                
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

        async function handleDeleteContact() {
            if (!contactToDelete) return;
            
            try {
                const response = await fetch(`${API_URL}/${contactToDelete}`, {
                    method: 'DELETE',
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to delete contact: ${response.status}`);
                }
                
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

        function handleSearch() {
            const query = searchInput.value.toLowerCase().trim();
            
            if (!query) {
                filteredContacts = [...contacts];
            } else {
                filteredContacts = contacts.filter(contact => 
                    contact.name.toLowerCase().includes(query) || 
                    contact.phone.includes(query) ||
                    contact.email.toLowerCase().includes(query)
                );
            }
            
            renderContacts();
        }

        function openDeleteModal(id) {
            contactToDelete = id;
            deleteModal.style.display = 'flex';
        }

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

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }

        function showSuccess(message) {
            successMessage.textContent = message;
            successMessage.style.display = 'block';
            
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);
        }
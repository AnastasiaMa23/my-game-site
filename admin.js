// ===========================================================
// ЛАБОРАТОРНАЯ №10: Административная панель
// ===========================================================
const ADMIN_EMAIL = 'anna@mail.ru'; // Твой email

document.addEventListener('DOMContentLoaded', function() {
    // Ждем, пока Firebase загрузится
    function waitForFirebase() {
        if (window.firebaseReady && window.auth) {
            initAdminPanel();
        } else {
            setTimeout(waitForFirebase, 100);
        }
    }
    waitForFirebase();
});

async function initAdminPanel() {
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
    
    // --- Кнопки "Войти" и "Выйти" ---
    const loginBtn = document.getElementById('login-btn');
    const authModal = document.getElementById('auth-modal');
    const modalClose = document.getElementById('modal-close');
    
    loginBtn?.addEventListener('click', () => authModal.classList.add('active'));
    modalClose?.addEventListener('click', () => authModal.classList.remove('active'));
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
        await signOut(window.auth);
    });

    // --- Вкладки (Вход/Регистрация) ---
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.getAttribute('data-tab') + '-form').classList.add('active');
        });
    });

    // --- Форма Входа ---
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
            await signInWithEmailAndPassword(window.auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
            alert('Вход выполнен!');
            authModal.classList.remove('active');
        } catch (error) { alert('Ошибка: ' + error.message); }
    });

    // --- Форма Регистрации ---
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
            const userCred = await createUserWithEmailAndPassword(window.auth, document.getElementById('register-email').value, document.getElementById('register-password').value);
            await updateProfile(userCred.user, { displayName: document.getElementById('register-name').value });
            alert('Регистрация успешна!');
            authModal.classList.remove('active');
        } catch (error) { alert('Ошибка: ' + error.message); }
    });

    // --- ПРОВЕРКА ДОСТУПА ---
    onAuthStateChanged(window.auth, (user) => {
        const userMenu = document.getElementById('user-menu');
        const adminContent = document.getElementById('admin-content');
        const accessDenied = document.getElementById('access-denied');

        // По умолчанию скрываем всё
        adminContent.style.display = 'none';
        accessDenied.style.display = 'none';

        if (user) {
            loginBtn.style.display = 'none';
            userMenu.style.display = 'flex';
            document.getElementById('user-display-name').textContent = user.displayName || user.email.split('@')[0];

            if (user.email === ADMIN_EMAIL) {
                // Это Админ
                adminContent.style.display = 'block';
                loadStats();
                loadAdminGames();
            } else {
                // Не Админ
                accessDenied.style.display = 'block';
            }
        } else {
            // Не авторизован
            loginBtn.style.display = 'block';
            userMenu.style.display = 'none';
            accessDenied.style.display = 'block'; // Показываем "Доступ запрещён"
        }
    });

    // --- ФОРМА ДОБАВЛЕНИЯ ИГРЫ ---
    const addGameForm = document.getElementById('add-game-form');
    if (addGameForm) {
        addGameForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            try {
                const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
                await addDoc(collection(window.db, 'games'), {
                    title: document.getElementById('title').value.trim(),
                    genre: document.getElementById('genre').value.trim(),
                    rating: parseFloat(document.getElementById('rating').value),
                    imageUrl: document.getElementById('imageUrl').value.trim()
                });
                alert('✅ Игра успешно добавлена!');
                addGameForm.reset();
                loadAdminGames();
                loadStats();
            } catch (error) { alert('❌ Ошибка: ' + error.message); }
        });
    }

    // --- Кнопка Обновить ---
    document.getElementById('refresh-btn')?.addEventListener('click', function() {
        loadAdminGames();
        loadStats();
    });

    // --- Экспорт в CSV ---
    document.getElementById('export-csv')?.addEventListener('click', async function() {
        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
            const querySnapshot = await getDocs(collection(window.db, 'games'));
            let csv = 'ID,Название,Жанр,Рейтинг,Картинка\n';
            querySnapshot.forEach(function(doc) {
                const game = doc.data();
                csv += `"${doc.id}","${game.title}","${game.genre}","${game.rating}","${game.imageUrl || ''}"\n`;
            });
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'games_' + new Date().toISOString().slice(0, 10) + '.csv';
            link.click();
        } catch (error) { alert('Ошибка экспорта: ' + error.message); }
    });

    // --- Кнопка Выйти в админке ---
    document.getElementById('admin-logout')?.addEventListener('click', async function() {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
        await signOut(window.auth);
        window.location.href = 'index.html';
    });
}

// --- СТАТИСТИКА ---
async function loadStats() {
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
        const gamesSnapshot = await getDocs(collection(window.db, 'games'));
        const scoresSnapshot = await getDocs(collection(window.db, 'scores'));
        
        let totalRating = 0;
        gamesSnapshot.forEach((doc) => totalRating += parseFloat(doc.data().rating) || 0);
        
        document.getElementById('stat-games').textContent = gamesSnapshot.size;
        document.getElementById('stat-scores').textContent = scoresSnapshot.size;
        document.getElementById('stat-avg').textContent = gamesSnapshot.size > 0 ? (totalRating / gamesSnapshot.size).toFixed(1) : 0;
    } catch (error) { console.error('Ошибка статистики:', error); }
}

// --- ТАБЛИЦА ИГР ---
async function loadAdminGames() {
    const tbody = document.getElementById('admin-games-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Загрузка...</td></tr>';

    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
        const querySnapshot = await getDocs(collection(window.db, 'games'));
        tbody.innerHTML = '';

        if (querySnapshot.size === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Нет игр</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const game = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><code>${doc.id.substring(0, 8)}...</code></td>
                    <td>${game.title}</td>
                    <td>${game.genre}</td>
                    <td>${game.rating}</td>
                    <td>
                        <div class="admin-actions-cell">
                            <button class="mini-btn edit" data-id="${doc.id}">✏️</button>
                            <button class="mini-btn delete" data-id="${doc.id}">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        attachAdminHandlers();
    } catch (error) { tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Ошибка: ${error.message}</td></tr>`; }
}

// --- ОБРАБОТЧИКИ КНОПОК В ТАБЛИЦЕ ---
function attachAdminHandlers() {
    document.querySelectorAll('.mini-btn.delete').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (!confirm('Удалить эту игру?')) return;
            try {
                const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
                await deleteDoc(doc(window.db, 'games', btn.getAttribute('data-id')));
                loadAdminGames();
                loadStats();
            } catch (error) { alert('Ошибка: ' + error.message); }
        });
    });

    document.querySelectorAll('.mini-btn.edit').forEach(btn => {
        btn.addEventListener('click', async function() {
            const newTitle = prompt('Новое название:', btn.closest('tr').cells[1].textContent);
            if (newTitle === null) return;
            try {
                const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
                await updateDoc(doc(window.db, 'games', btn.getAttribute('data-id')), { title: newTitle.trim() });
                loadAdminGames();
            } catch (error) { alert('Ошибка: ' + error.message); }
        });
    });
}
// ====================================================
// ОТРИСОВКА КАРТОЧЕК
// ====================================================
function renderGames(games) {
    const container = document.getElementById('games-container');
    if (!container) return;
    container.innerHTML = '';
    if (games.length === 0) {
        container.innerHTML = '<p>Пока нет игр или они не подходят под фильтры</p>';
        return;
    }
    games.forEach((game) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <img src="${game.imageUrl || 'https://via.placeholder.com/280x150'}" alt="${game.title}" class="game-image">
            <h3 class="game-title">${game.title}</h3>
            <p class="game-short">Жанр: ${game.genre}</p>
            <p class="game-rating">⭐ Рейтинг: ${game.rating}/10</p>
            <div class="card-actions">
                <button class="edit-btn" onclick="window.editGame('${game.id}')">✏️ Изменить</button>
                <button class="delete-btn" onclick="window.deleteGame('${game.id}')">🗑️ Удалить</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ====================================================
// ЛАБОРАТОРНАЯ 11: ЗАГРУЗКА И ФИЛЬТРАЦИЯ
// ====================================================
let allGames = [];

function showSkeletons(count = 3) {
    const container = document.getElementById('games-container');
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
        `;
        container.appendChild(skeleton);
    }
}

async function loadAllGames() {
    try {
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
        const querySnapshot = await getDocs(collection(window.db, 'games'));
        allGames = [];
        querySnapshot.forEach((doc) => allGames.push({ id: doc.id, ...doc.data() }));
        applyFilters();
    } catch (error) { console.error('Ошибка загрузки:', error); }
}

function applyFilters() {
    const searchText = document.getElementById('search-input')?.value.toLowerCase().trim() || "";
    const genreFilter = document.getElementById('genre-filter')?.value || "";
    const ratingFilter = parseFloat(document.getElementById('rating-filter')?.value) || 0;
    const sortFilter = document.getElementById('sort-filter')?.value || 'default';
    
    let filtered = [...allGames];
    
    if (searchText) {
        filtered = filtered.filter(g => 
            g.title.toLowerCase().includes(searchText) || 
            g.genre.toLowerCase().includes(searchText)
        );
    }
    if (genreFilter) filtered = filtered.filter(g => g.genre === genreFilter);
    if (ratingFilter > 0) filtered = filtered.filter(g => parseFloat(g.rating) >= ratingFilter);
    
    switch (sortFilter) {
        case 'rating-desc': filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)); break;
        case 'rating-asc': filtered.sort((a, b) => parseFloat(a.rating) - parseFloat(b.rating)); break;
        case 'title-asc': filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'title-desc': filtered.sort((a, b) => b.title.localeCompare(a.title)); break;
    }
    
    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = `Найдено: ${filtered.length}`;
    renderGames(filtered);
}

// ====================================================
// УДАЛЕНИЕ И РЕДАКТИРОВАНИЕ
// ====================================================
window.deleteGame = async function(id) {
    if (!confirm('Удалить игру?')) return;
    try {
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
        await deleteDoc(doc(window.db, 'games', id));
        alert('✅ Игра удалена!');
        loadAllGames();
    } catch (error) { alert('Ошибка: ' + error.message); }
};

window.editGame = async function(id) {
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
        const docSnap = await getDoc(doc(window.db, 'games', id));
        if (!docSnap.exists()) return;
        const game = docSnap.data();
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-title').value = game.title || '';
        document.getElementById('edit-genre').value = game.genre || '';
        document.getElementById('edit-rating').value = game.rating || 0;
        document.getElementById('edit-imageUrl').value = game.imageUrl || '';
        document.getElementById('edit-modal').classList.add('active');
    } catch (error) { alert('Ошибка: ' + error.message); }
};

// ====================================================
// ЛИДЕРБОРД
// ====================================================
async function loadLeaderboard(filterGame = '') {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    try {
        const { collection, query, orderBy, limit, where, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
        let q;
        if (filterGame) q = query(collection(window.db, 'scores'), where('gameTitle', '==', filterGame), orderBy('score', 'desc'), limit(10));
        else q = query(collection(window.db, 'scores'), orderBy('score', 'desc'), limit(10));
        
        const querySnapshot = await getDocs(q);
        const scores = [];
        querySnapshot.forEach((doc) => scores.push(doc.data()));
        
        tbody.innerHTML = '';
        if (scores.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Нет рекордов</td></tr>'; return; }
        const medals = ['🥇', '🥈', '🥉'];
        scores.forEach((score, index) => {
            const tr = document.createElement('tr');
            const place = index < 3 ? medals[index] + ' ' + (index + 1) : index + 1;
            tr.innerHTML = `<td><strong>${place}</strong></td><td>${score.playerName}</td><td><strong>${score.score}</strong></td><td>${score.gameTitle}</td>`;
            tbody.appendChild(tr);
        });
    } catch (error) { tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Ошибка загрузки</td></tr>'; }
}

// ====================================================
// АВТОРИЗАЦИЯ И ЗАПУСК
// ====================================================
document.addEventListener('DOMContentLoaded', function() {

    // Кнопки "Войти" и "Выйти"
    document.getElementById('login-btn')?.addEventListener('click', () => document.getElementById('auth-modal').classList.add('active'));
    document.getElementById('modal-close')?.addEventListener('click', () => document.getElementById('auth-modal').classList.remove('active'));
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
        await signOut(window.auth);
    });

    //слушатель кнопки лаба 12
    document.addEventListener('DOMContentLoaded', () => {
    const burgerToggle = document.getElementById('burger-toggle');
    const navItems = document.querySelectorAll('.main-nav a, .main-nav button');

    // При клике на любую ссылку или кнопку внутри меню — снимаем галочку с чекбокса (меню скроется)
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            burgerToggle.checked = false;
        });
    });
});

    // Вкладки
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.getAttribute('data-tab') + '-form').classList.add('active');
        });
    });

    // Регистрация
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
            const userCred = await createUserWithEmailAndPassword(window.auth, document.getElementById('register-email').value, document.getElementById('register-password').value);
            await updateProfile(userCred.user, { displayName: document.getElementById('register-name').value });
            alert('Регистрация успешна!');
            document.getElementById('auth-modal').classList.remove('active');
        } catch (error) { alert('Ошибка: ' + error.message); }
    });

    // Вход
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
            await signInWithEmailAndPassword(window.auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
            alert('Вход выполнен!');
            document.getElementById('auth-modal').classList.remove('active');
        } catch (error) { alert('Ошибка: ' + error.message); }
    });

    // Отслеживание входа
    import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js').then(({ onAuthStateChanged }) => {
        onAuthStateChanged(window.auth, (user) => {
            if (user) {
                document.getElementById('login-btn').style.display = 'none';
                document.getElementById('user-menu').style.display = 'flex';
                document.getElementById('user-display-name').textContent = user.displayName || user.email.split('@')[0];
            } else {
                document.getElementById('login-btn').style.display = 'block';
                document.getElementById('user-menu').style.display = 'none';
            }
        });
    });

    // Фильтры
    document.getElementById('search-input')?.addEventListener('input', applyFilters);
    document.getElementById('genre-filter')?.addEventListener('change', applyFilters);
    document.getElementById('rating-filter')?.addEventListener('input', applyFilters);
    document.getElementById('sort-filter')?.addEventListener('change', applyFilters);
    
    // Сброс фильтров
    document.getElementById('reset-filters')?.addEventListener('click', function() {
        document.getElementById('search-input').value = '';
        document.getElementById('genre-filter').value = '';
        document.getElementById('rating-filter').value = '';
        document.getElementById('sort-filter').value = 'default';
        applyFilters();
    });

    // Лидерборд
    document.getElementById('score-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
            await addDoc(collection(window.db, 'scores'), {
                playerName: document.getElementById('player-name').value,
                score: parseInt(document.getElementById('player-score').value),
                gameTitle: document.getElementById('game-title').value,
                createdAt: new Date()
            });
            alert('Рекорд добавлен!');
            e.target.reset();
            loadLeaderboard(document.getElementById('leaderboard-game-filter').value);
        } catch (error) { alert('Ошибка: ' + error.message); }
    });

    document.getElementById('leaderboard-game-filter')?.addEventListener('change', (e) => loadLeaderboard(e.target.value));

    // Сохранение редактирования
    document.getElementById('edit-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
            await updateDoc(doc(window.db, 'games', document.getElementById('edit-id').value), {
                title: document.getElementById('edit-title').value,
                genre: document.getElementById('edit-genre').value,
                rating: parseFloat(document.getElementById('edit-rating').value),
                imageUrl: document.getElementById('edit-imageUrl').value
            });
            alert('✅ Игра обновлена!');
            document.getElementById('edit-modal').classList.remove('active');
            loadAllGames();
        } catch (error) { alert('Ошибка: ' + error.message); }
    });
    document.getElementById('cancel-edit')?.addEventListener('click', () => document.getElementById('edit-modal').classList.remove('active'));

    // Запуск загрузки
    function waitForFirebase() {
        if (window.firebaseReady && window.db) {
            loadAllGames();
            loadLeaderboard();
        } else {
            setTimeout(waitForFirebase, 100);
        }
    }
    waitForFirebase();
});
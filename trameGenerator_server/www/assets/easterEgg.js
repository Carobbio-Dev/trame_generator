document.addEventListener('DOMContentLoaded', () => {

    const secretCode = ['ArrowUp', 'ArrowUp', 'ArrowDown','ArrowDown', 'ArrowLeft', 'ArrowRight','ArrowLeft', 'ArrowRight'];
    let inputSequence = [];


    document.addEventListener('keydown', (e) => {
        // Ajouter la touche pressée à la séquence
        inputSequence.push(e.key);

        // Vérifier si la séquence est toujours valide
        if (inputSequence.length > secretCode.length || inputSequence[inputSequence.length - 1] !== secretCode[inputSequence.length - 1]) {
            // Si la séquence est invalide, réinitialiser
            inputSequence = []; //on reset dès que la séquence a un caractere qui va pas.
        }

        // Vérifier si la séquence complète est correcte //  on doit faire la sequence entiere de suite pour que ça soit ok
        if (inputSequence.length === secretCode.length && inputSequence.every((key, index) => key === secretCode[index])) {
            launchRocket();
            inputSequence = []; // Réinitialiser après succès
        }
    });

    function launchRocket() {
        const sidebar = document.getElementById('sidebar'); 
        const rocket = document.createElement('div');


        rocket.classList.add('rocket');
        rocket.innerHTML = '<i class="fas fa-rocket"></i>'; // Icône de fusée Font Awesome
        rocket.style.position = 'fixed';
        rocket.style.bottom = '0';
        rocket.style.left = `${sidebar.getBoundingClientRect().width / 2}px`; 
        rocket.style.fontSize = '30px';
        rocket.style.transform = 'translateX(-50%) rotate(-45deg)'; //rotation intiale pour qu'elle pointe vers le haut
        rocket.style.transition = 'bottom 8s ease-in';

        
        if (!sidebar) return;
        
        sidebar.appendChild(rocket);

        // Lancer l'animation
        setTimeout(() => {
            rocket.style.bottom = '100%';
        }, 50);

        // Supprimer après l'animation
        setTimeout(() => {
            rocket.remove();
        }, 9000);
    }

});
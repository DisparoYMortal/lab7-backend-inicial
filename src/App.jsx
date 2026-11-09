function App() {

    const baraja1 = [
        "A_sword", "2_sword", "3_sword", "4_sword", "5_sword", "6_sword", "7_sword", "8_sword", "9_sword", "10_sword", "J_sword", "Q_sword", "K_sword",
        "A_cup", "2_cup", "3_cup", "4_cup", "5_cup", "6_cup", "7_cup", "8_cup", "9_cup", "10_cup", "J_cup", "Q_cup", "K_cup",
        "A_coin", "2_coin", "3_coin", "4_coin", "5_coin", "6_coin", "7_coin", "8_coin", "9_coin", "10_coin", "J_coin", "Q_coin", "K_coin",
        "A_club", "2_club", "3_club", "4_club", "5_club", "6_club", "7_club", "8_club", "9_club", "10_club", "J_club", "Q_club", "K_club"
    ];

    const baraja2 = [
        "A_sword1", "2_sword1", "3_sword1", "4_sword1", "5_sword1", "6_sword1", "7_sword1", "8_sword1", "9_sword1", "10_sword1", "J_sword1", "Q_sword1", "K_sword1",
        "A_cup1", "2_cup1", "3_cup1", "4_cup1", "5_cup1", "6_cup1", "7_cup1", "8_cup1", "9_cup1", "10_cup1", "J_cup1", "Q_cup1", "K_cup1",
        "A_coin1", "2_coin1", "3_coin1", "4_coin1", "5_coin1", "6_coin1", "7_coin1", "8_coin1", "9_coin1", "10_coin1", "J_coin1", "Q_coin1", "K_coin1",
        "A_club1", "2_club1", "3_club1", "4_club1", "5_club1", "6_club1", "7_club1", "8_club1", "9_club1", "10_club1", "J_club1", "Q_club1", "K_club1"
    ];

    const lista = baraja1.concat(baraja2);

    // Mezclar la baraja
    for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [lista[i], lista[j]] = [lista[j], lista[i]];
    }

    // Seleccionar 12 cartas
    const mano = lista.slice(0, 12);

    console.log(mano);

    return (
        <div>
            <h1>Mi juego de cartas</h1>

            <h2>Mi mano</h2>

            {mano.map((carta, index) => (
                <p key={index}>{carta}</p>
            ))}
        </div>
    );
}

export default App;





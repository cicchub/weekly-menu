# Formato del piano settimanale

Weekly Menu non genera il menu da sola. Ogni settimana il piano si prepara in una chat con Claude, poi si incolla nell'app,
nella sezione **Importa**. Questo documento descrive il testo da incollare: Claude lo deve seguire alla lettera.

## Istruzioni per Claude

### Prima di scrivere il piano

Leggi due file del repository privato dei dati, `weekly-menu-dati`:

- **`alimenti.json`**: l'anagrafica. Per ogni alimento:
  - `nome`;
  - i valori `per_100g`, cioè kcal e grammi di proteine, carboidrati, grassi e fibre;
  - `porzione_g`;
  - `confezione_g`, il peso di una confezione;
  - `reparto`;
  - `codice_a_barre`;
  - `foto`.
- **`obiettivi.json`**: calorie e macro di ogni tipo di giornata (`riposo`, `palestra`, `apnea`) e le tolleranze.

Le tolleranze sono queste:

- **Calorie**: ±5% dall'obiettivo.
- **Proteine**: almeno l'obiettivo.
- **Carboidrati**: ±10%.
- **Grassi**: ±10%.
- **Fibre**: almeno l'obiettivo.

Valgono i valori scritti in `obiettivi.json`, se sono diversi da questi.

Usa gli alimenti dell'anagrafica quando puoi.

Per un alimento che non c'è, ricava i valori per 100 g dalla foto della tabella nutrizionale che ti viene data, e mettilo in
`alimenti_nuovi`. Cerca poi online una foto dell'alimento e scrivi il link in `foto`.

### Regole

1. **Rispondi con il solo JSON**, in un unico blocco di codice. Niente commenti dentro il JSON: il JSON non li ammette.
2. **I due campi fissi**: `"formato": "weekly-menu-piano"` e `"versione": 1`.
3. **La settimana**: `settimana.dal` e `settimana.al` sono date nel formato `AAAA-MM-GG`, al massimo 7 giorni.
   - In `giorni` c'è un elemento per ogni data, senza ripetizioni.
4. **Il tipo di giornata**: `tipo` è uno di quelli di `obiettivi.json`: `riposo`, `palestra` o `apnea`.
   - `serata_impegnata` è `true` o `false`.
5. **I pasti sono sempre cinque, con queste chiavi**: `colazione`, `spuntino_mattina`, `pranzo`, `spuntino_pomeriggio`, `cena`.
6. **Gli alimenti di un pasto**: ogni alimento è `{"nome": "...", "grammi": numero}`.
   - **Il nome è identico a quello di `alimenti.json`**, oppure a quello di un alimento in `alimenti_nuovi`.
   - Se conosci il codice a barre aggiungi `"codice_a_barre": "..."`, tra virgolette.
   - I grammi si riferiscono all'alimento così com'è descritto in anagrafica: crudo, se i valori sono da crudo.
7. **Le alternative**: un pasto può avere fino a **2** `alternative`, ognuna con i suoi `alimenti`.
   - Le alternative non entrano nella lista della spesa.
8. **Il pasto libero** (pizza, cena fuori): `"libero": true`, una `descrizione` breve e la `stima` dei macro del pasto intero.
   - La stima ha `kcal`, `proteine`, `carboidrati`, `grassi` e `fibre`.
   - Niente `alimenti` e niente `alternative`.
9. **Gli alimenti nuovi**: ognuno ha `nome`, i valori `per_100g` (`kcal`, `proteine`, `carboidrati`, `grassi`, `fibre`) e `porzione_g`. Poi, se li conosci:
   - `confezione_g`, il peso netto di una confezione, che serve a contare le confezioni da comprare;
   - `codice_a_barre`;
   - `reparto`;
   - `foto`.
   
   Un alimento già in anagrafica non va rimesso tra i nuovi.
10. **Il reparto** è uno di questi: Frutta e verdura, Pane e forno, Carne, Pesce, Salumi e formaggi, Latticini e uova, Surgelati,
    Bevande, Altro, Dispensa. Serve a ordinare la lista della spesa: la dispensa va in fondo.
11. **La foto** è il link diretto a un'immagine (`https://…`): aprendolo deve comparire l'immagine, non una pagina.
    - **Prodotti con codice a barre**: usa l'immagine del prodotto di Open Food Facts, il campo `image_front_small_url` di
      `https://world.openfoodfacts.org/api/v2/product/<codice>.json`. È un link `https://images.openfoodfacts.org/…`.
    - **Alimenti freschi**: usa un'immagine di Wikimedia Commons nel formato
      `https://upload.wikimedia.org/wikipedia/commons/thumb/…/250px-….jpg`.
    
    Questi due siti permettono all'app di salvare la foto nei dati. Con altri siti la foto si vede solo con la rete, se si vede.
12. **Le preparazioni** dicono quando cucinare (`data`), cosa (`piatti[].nome`), con quali alimenti (`alimenti`, i nomi) e per quali pasti (`per`).
    - `per` è un elenco di `{"data", "pasto"}`.
    - Le quantità non servono: l'app le calcola dai pasti, sia il totale da cucinare sia quanto mettere in ogni schiscetta.
13. **I macro li calcola l'app** dall'anagrafica. Non scrivere i totali dei pasti o dei giorni.
    - Fa eccezione la stima dei pasti liberi.
    - Cerca comunque di tenere ogni giornata dentro le tolleranze.

## Cosa fa l'app quando importi

- **Riconosce gli alimenti**:
  1. prima dal codice a barre;
  2. poi dal nome identico, senza contare maiuscole, accenti e punteggiatura.
  
  Se un nome è solo simile a uno dell'anagrafica, chiede se è lo stesso alimento. Un alimento sconosciuto e senza valori è un errore.
- **Non crea doppioni.** Un alimento «nuovo» già presente in anagrafica completa solo quello che manca (foto, codice a barre,
  confezione, reparto). I valori restano quelli dell'anagrafica.
- **Mostra un riepilogo** e salva solo dopo la conferma:
  - alimenti nuovi;
  - alimenti riconosciuti;
  - giornate fuori tolleranza;
  - errori e avvisi.
- **Se la settimana ha già dei pasti**, chiede se sostituirla. I pasti segnati come già mangiati restano com'erano.
- **Aggiorna la lista della spesa**, con il totale della settimana per ogni alimento e le confezioni da comprare.
  - Restano fuori pasti liberi, alternative e pasti già mangiati.
  - Le righe scritte a mano restano.

## Esempio completo

Una settimana da lunedì a domenica, con:
- giornate di palestra, apnea e riposo;
- una serata impegnata;
- una colazione e una cena con alternative;
- una cena libera;
- due sessioni di preparazione.

È il primo piano, con l'anagrafica ancora vuota: per questo tutti gli alimenti sono in `alimenti_nuovi`. Dalla settimana dopo
basta usare i nomi di `alimenti.json`, e in `alimenti_nuovi` vanno solo quelli davvero nuovi.

I codici a barre dell'esempio sono finti: iniziano con 2, la serie dei codici a uso interno dei negozi.

```json
{
  "formato": "weekly-menu-piano",
  "versione": 1,
  "settimana": {"dal": "2026-11-16", "al": "2026-11-22"},
  "giorni": [
    {
      "data": "2026-11-16",
      "tipo": "palestra",
      "serata_impegnata": false,
      "pasti": {
        "colazione": {
          "alimenti": [
            {"nome": "Yogurt greco 0%", "grammi": 250},
            {"nome": "Fiocchi d'avena", "grammi": 80},
            {"nome": "Banana", "grammi": 150}
          ],
          "alternative": [
            {
              "alimenti": [
                {"nome": "Uova", "grammi": 120},
                {"nome": "Pane integrale", "grammi": 100},
                {"nome": "Mela", "grammi": 180}
              ]
            }
          ]
        },
        "spuntino_mattina": {
          "alimenti": [{"nome": "Mela", "grammi": 180}, {"nome": "Mandorle", "grammi": 25}]
        },
        "pranzo": {
          "alimenti": [
            {"nome": "Riso basmati", "grammi": 130},
            {"nome": "Petto di pollo", "grammi": 150},
            {"nome": "Zucchine", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        },
        "spuntino_pomeriggio": {
          "alimenti": [
            {"nome": "Pane integrale", "grammi": 100},
            {"nome": "Tonno al naturale", "grammi": 80}
          ]
        },
        "cena": {
          "alimenti": [
            {"nome": "Pasta integrale", "grammi": 110},
            {"nome": "Salmone", "grammi": 130},
            {"nome": "Spinaci surgelati", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        }
      }
    },
    {
      "data": "2026-11-17",
      "tipo": "apnea",
      "serata_impegnata": true,
      "pasti": {
        "colazione": {
          "alimenti": [
            {"nome": "Uova", "grammi": 120},
            {"nome": "Pane integrale", "grammi": 100},
            {"nome": "Mela", "grammi": 180}
          ]
        },
        "spuntino_mattina": {
          "alimenti": [{"nome": "Yogurt greco 0%", "grammi": 170}, {"nome": "Mandorle", "grammi": 30}]
        },
        "pranzo": {
          "alimenti": [
            {"nome": "Riso basmati", "grammi": 120},
            {"nome": "Petto di pollo", "grammi": 180},
            {"nome": "Zucchine", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        },
        "spuntino_pomeriggio": {
          "alimenti": [
            {"nome": "Fiocchi di latte", "grammi": 150},
            {"nome": "Fiocchi d'avena", "grammi": 60}
          ]
        },
        "cena": {
          "alimenti": [
            {"nome": "Pasta integrale", "grammi": 90},
            {"nome": "Ceci cotti", "grammi": 150},
            {"nome": "Tonno al naturale", "grammi": 80},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        }
      }
    },
    {
      "data": "2026-11-18",
      "tipo": "palestra",
      "serata_impegnata": false,
      "pasti": {
        "colazione": {
          "alimenti": [
            {"nome": "Yogurt greco 0%", "grammi": 250},
            {"nome": "Fiocchi d'avena", "grammi": 80},
            {"nome": "Banana", "grammi": 150}
          ]
        },
        "spuntino_mattina": {
          "alimenti": [{"nome": "Mela", "grammi": 180}, {"nome": "Mandorle", "grammi": 25}]
        },
        "pranzo": {
          "alimenti": [
            {"nome": "Riso basmati", "grammi": 130},
            {"nome": "Petto di pollo", "grammi": 150},
            {"nome": "Zucchine", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        },
        "spuntino_pomeriggio": {
          "alimenti": [
            {"nome": "Pane integrale", "grammi": 100},
            {"nome": "Tonno al naturale", "grammi": 80}
          ]
        },
        "cena": {
          "alimenti": [
            {"nome": "Pasta integrale", "grammi": 110},
            {"nome": "Salmone", "grammi": 130},
            {"nome": "Spinaci surgelati", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        }
      }
    },
    {
      "data": "2026-11-19",
      "tipo": "riposo",
      "serata_impegnata": false,
      "pasti": {
        "colazione": {
          "alimenti": [
            {"nome": "Uova", "grammi": 120},
            {"nome": "Pane integrale", "grammi": 90},
            {"nome": "Mela", "grammi": 180}
          ]
        },
        "spuntino_mattina": {
          "alimenti": [{"nome": "Yogurt greco 0%", "grammi": 170}, {"nome": "Mandorle", "grammi": 25}]
        },
        "pranzo": {
          "alimenti": [
            {"nome": "Riso basmati", "grammi": 100},
            {"nome": "Petto di pollo", "grammi": 180},
            {"nome": "Zucchine", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        },
        "spuntino_pomeriggio": {
          "alimenti": [
            {"nome": "Fiocchi di latte", "grammi": 150},
            {"nome": "Fiocchi d'avena", "grammi": 50}
          ]
        },
        "cena": {
          "alimenti": [
            {"nome": "Pasta integrale", "grammi": 80},
            {"nome": "Ceci cotti", "grammi": 150},
            {"nome": "Tonno al naturale", "grammi": 80},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ],
          "alternative": [
            {
              "alimenti": [
                {"nome": "Pasta integrale", "grammi": 80},
                {"nome": "Salmone", "grammi": 150},
                {"nome": "Spinaci surgelati", "grammi": 200},
                {"nome": "Olio extravergine d'oliva", "grammi": 10}
              ]
            },
            {
              "alimenti": [
                {"nome": "Uova", "grammi": 180},
                {"nome": "Pane integrale", "grammi": 80},
                {"nome": "Spinaci surgelati", "grammi": 200},
                {"nome": "Olio extravergine d'oliva", "grammi": 10}
              ]
            }
          ]
        }
      }
    },
    {
      "data": "2026-11-20",
      "tipo": "palestra",
      "serata_impegnata": false,
      "pasti": {
        "colazione": {
          "alimenti": [
            {"nome": "Yogurt greco 0%", "grammi": 250},
            {"nome": "Fiocchi d'avena", "grammi": 80},
            {"nome": "Banana", "grammi": 150}
          ]
        },
        "spuntino_mattina": {
          "alimenti": [{"nome": "Mela", "grammi": 180}, {"nome": "Mandorle", "grammi": 25}]
        },
        "pranzo": {
          "alimenti": [
            {"nome": "Riso basmati", "grammi": 130},
            {"nome": "Petto di pollo", "grammi": 150},
            {"nome": "Zucchine", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        },
        "spuntino_pomeriggio": {
          "alimenti": [
            {"nome": "Pane integrale", "grammi": 100},
            {"nome": "Tonno al naturale", "grammi": 80}
          ]
        },
        "cena": {
          "alimenti": [
            {"nome": "Pasta integrale", "grammi": 110},
            {"nome": "Salmone", "grammi": 130},
            {"nome": "Spinaci surgelati", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 15}
          ]
        }
      }
    },
    {
      "data": "2026-11-21",
      "tipo": "riposo",
      "serata_impegnata": true,
      "pasti": {
        "colazione": {
          "alimenti": [
            {"nome": "Uova", "grammi": 180},
            {"nome": "Pane integrale", "grammi": 80},
            {"nome": "Mela", "grammi": 180}
          ]
        },
        "spuntino_mattina": {
          "alimenti": [{"nome": "Mela", "grammi": 180}, {"nome": "Mandorle", "grammi": 15}]
        },
        "pranzo": {
          "alimenti": [
            {"nome": "Pasta integrale", "grammi": 80},
            {"nome": "Tonno al naturale", "grammi": 160},
            {"nome": "Zucchine", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 10}
          ]
        },
        "spuntino_pomeriggio": {
          "alimenti": [
            {"nome": "Fiocchi di latte", "grammi": 200},
            {"nome": "Fiocchi d'avena", "grammi": 30}
          ]
        },
        "cena": {
          "libero": true,
          "descrizione": "Pizza con gli amici",
          "stima": {"kcal": 900, "proteine": 35, "carboidrati": 115, "grassi": 30, "fibre": 6}
        }
      }
    },
    {
      "data": "2026-11-22",
      "tipo": "riposo",
      "serata_impegnata": false,
      "pasti": {
        "colazione": {
          "alimenti": [
            {"nome": "Yogurt greco 0%", "grammi": 250},
            {"nome": "Fiocchi d'avena", "grammi": 60},
            {"nome": "Banana", "grammi": 120}
          ]
        },
        "spuntino_mattina": {
          "alimenti": [{"nome": "Yogurt greco 0%", "grammi": 170}, {"nome": "Mandorle", "grammi": 30}]
        },
        "pranzo": {
          "alimenti": [
            {"nome": "Riso basmati", "grammi": 90},
            {"nome": "Petto di pollo", "grammi": 180},
            {"nome": "Zucchine", "grammi": 200},
            {"nome": "Olio extravergine d'oliva", "grammi": 20}
          ]
        },
        "spuntino_pomeriggio": {
          "alimenti": [
            {"nome": "Pane integrale", "grammi": 80},
            {"nome": "Tonno al naturale", "grammi": 80}
          ]
        },
        "cena": {
          "alimenti": [
            {"nome": "Pasta integrale", "grammi": 80},
            {"nome": "Ceci cotti", "grammi": 150},
            {"nome": "Tonno al naturale", "grammi": 80},
            {"nome": "Olio extravergine d'oliva", "grammi": 20}
          ]
        }
      }
    }
  ],
  "preparazioni": [
    {
      "data": "2026-11-15",
      "titolo": "Domenica pomeriggio",
      "piatti": [
        {
          "nome": "Pollo al forno con riso e zucchine",
          "alimenti": ["Petto di pollo", "Riso basmati", "Zucchine"],
          "per": [
            {"data": "2026-11-16", "pasto": "pranzo"},
            {"data": "2026-11-17", "pasto": "pranzo"},
            {"data": "2026-11-18", "pasto": "pranzo"}
          ]
        }
      ]
    },
    {
      "data": "2026-11-18",
      "titolo": "Mercoledì sera",
      "piatti": [
        {
          "nome": "Pollo al forno con riso e zucchine",
          "alimenti": ["Petto di pollo", "Riso basmati", "Zucchine"],
          "per": [
            {"data": "2026-11-19", "pasto": "pranzo"},
            {"data": "2026-11-20", "pasto": "pranzo"}
          ]
        },
        {
          "nome": "Pasta e ceci",
          "alimenti": ["Pasta integrale", "Ceci cotti"],
          "per": [
            {"data": "2026-11-19", "pasto": "cena"},
            {"data": "2026-11-22", "pasto": "cena"}
          ]
        }
      ]
    }
  ],
  "alimenti_nuovi": [
    {
      "nome": "Yogurt greco 0%",
      "codice_a_barre": "2000000000015",
      "per_100g": {"kcal": 57, "proteine": 10, "carboidrati": 3.6, "grassi": 0.2, "fibre": 0},
      "porzione_g": 170,
      "confezione_g": 500,
      "reparto": "Latticini e uova"
    },
    {
      "nome": "Fiocchi d'avena",
      "per_100g": {"kcal": 372, "proteine": 13.5, "carboidrati": 58.7, "grassi": 7, "fibre": 10},
      "porzione_g": 50,
      "confezione_g": 500,
      "reparto": "Dispensa"
    },
    {
      "nome": "Banana",
      "per_100g": {"kcal": 89, "proteine": 1.1, "carboidrati": 22.8, "grassi": 0.3, "fibre": 2.6},
      "porzione_g": 120,
      "reparto": "Frutta e verdura",
      "foto": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Banana-Single.jpg/250px-Banana-Single.jpg"
    },
    {
      "nome": "Mela",
      "per_100g": {"kcal": 52, "proteine": 0.3, "carboidrati": 13.8, "grassi": 0.2, "fibre": 2.4},
      "porzione_g": 180,
      "reparto": "Frutta e verdura"
    },
    {
      "nome": "Mandorle",
      "per_100g": {"kcal": 603, "proteine": 22, "carboidrati": 4.6, "grassi": 55.3, "fibre": 12.7},
      "porzione_g": 25,
      "confezione_g": 200,
      "reparto": "Dispensa"
    },
    {
      "nome": "Uova",
      "per_100g": {"kcal": 128, "proteine": 12.4, "carboidrati": 0.7, "grassi": 8.7, "fibre": 0},
      "porzione_g": 60,
      "confezione_g": 360,
      "reparto": "Latticini e uova"
    },
    {
      "nome": "Pane integrale",
      "per_100g": {"kcal": 240, "proteine": 9, "carboidrati": 42, "grassi": 3, "fibre": 6.5},
      "porzione_g": 60,
      "confezione_g": 400,
      "reparto": "Pane e forno"
    },
    {
      "nome": "Riso basmati",
      "per_100g": {"kcal": 350, "proteine": 8, "carboidrati": 77, "grassi": 0.8, "fibre": 1.5},
      "porzione_g": 80,
      "confezione_g": 1000,
      "reparto": "Dispensa"
    },
    {
      "nome": "Pasta integrale",
      "per_100g": {"kcal": 350, "proteine": 13, "carboidrati": 64, "grassi": 2.5, "fibre": 8},
      "porzione_g": 90,
      "confezione_g": 500,
      "reparto": "Dispensa"
    },
    {
      "nome": "Petto di pollo",
      "per_100g": {"kcal": 108, "proteine": 23, "carboidrati": 0, "grassi": 1.5, "fibre": 0},
      "porzione_g": 150,
      "confezione_g": 400,
      "reparto": "Carne"
    },
    {
      "nome": "Salmone",
      "per_100g": {"kcal": 185, "proteine": 20, "carboidrati": 0, "grassi": 12, "fibre": 0},
      "porzione_g": 150,
      "confezione_g": 250,
      "reparto": "Pesce"
    },
    {
      "nome": "Tonno al naturale",
      "codice_a_barre": "2000000000022",
      "per_100g": {"kcal": 103, "proteine": 24, "carboidrati": 0, "grassi": 0.8, "fibre": 0},
      "porzione_g": 80,
      "confezione_g": 240,
      "reparto": "Dispensa"
    },
    {
      "nome": "Zucchine",
      "per_100g": {"kcal": 17, "proteine": 1.3, "carboidrati": 1.4, "grassi": 0.1, "fibre": 1.2},
      "porzione_g": 200,
      "reparto": "Frutta e verdura"
    },
    {
      "nome": "Spinaci surgelati",
      "per_100g": {"kcal": 23, "proteine": 2.9, "carboidrati": 1.4, "grassi": 0.4, "fibre": 2.2},
      "porzione_g": 200,
      "confezione_g": 750,
      "reparto": "Surgelati"
    },
    {
      "nome": "Fiocchi di latte",
      "per_100g": {"kcal": 97, "proteine": 11, "carboidrati": 3, "grassi": 4.5, "fibre": 0},
      "porzione_g": 150,
      "confezione_g": 200,
      "reparto": "Latticini e uova"
    },
    {
      "nome": "Ceci cotti",
      "per_100g": {"kcal": 120, "proteine": 7, "carboidrati": 14, "grassi": 2.5, "fibre": 6},
      "porzione_g": 150,
      "confezione_g": 240,
      "reparto": "Dispensa"
    },
    {
      "nome": "Olio extravergine d'oliva",
      "per_100g": {"kcal": 899, "proteine": 0, "carboidrati": 0, "grassi": 99.9, "fibre": 0},
      "porzione_g": 10,
      "confezione_g": 920,
      "reparto": "Dispensa"
    }
  ]
}
```

# Anomalies report: 2025-26 Topps Basketball

Source: official Topps checklist (local file, not stored). Generated 2026-10-06.

## Summary

- Cards written: 300 (rookies: 45)
- Base sections: 2, variation sections: 11, rows read: 3356
- Variation parallels found: Golden Mirror Image Variation, Clear Variation, Team Color Border Variation, Blackout Variation, Player Number Variation
- Numbered parallels applied: Rainbow Foilboard, Gold/2025, Purple Rainbow/250, Blue Rainbow/150, Green Rainbow/99, Black/68, Gold Rainbow/50, Orange Rainbow/25, Wood/25, Black Rainbow/10, Red Rainbow/5, FoilFractor/1, First Card/1
- Existing players matched: 271
- New players: 0

## Unverified cards

The base section is the source of truth. These numbers have a different player in at least one
variation section; verify with a real card photo before trusting them:

- #51: Obi Toppin (base) — UNVERIFIED
- #53: Pascal Siakam (base) — UNVERIFIED

## Rules applied

- Teams: the base section wins when a variation section disagrees. The team printed on a card is
  catalog information only; stats and "Last night" match on player identity, never on the team.
- Team cards and other rows without a player (e.g. "WE THE NORTH RAPTORS SHINE") are skipped for the MVP.
- Known team misspellings (e.g. "Portland Trailblazers") are normalized automatically and listed as team_alias.

## Anomalies by type

- player_mismatch: 6
- team_mismatch: 2
- suspicious_name: 2
- name_variant: 1
- non_player_row: 1

## Details

- [player_mismatch] (BASE CARDS I GOLDEN MIRROR IMAGE VARIATION, line 326) #51: base "Obi Toppin" vs "Pascal Siakam" in BASE CARDS I GOLDEN MIRROR IMAGE VARIATION
- [player_mismatch] (BASE CARDS I GOLDEN MIRROR IMAGE VARIATION, line 328) #53: base "Pascal Siakam" vs "Obi Toppin" in BASE CARDS I GOLDEN MIRROR IMAGE VARIATION
- [team_mismatch] (BASE CARDS I GOLDEN MIRROR IMAGE VARIATION, line 432) #157 Kevin Durant: base "Houston Rockets" vs "Phoenix Suns" in BASE CARDS I GOLDEN MIRROR IMAGE VARIATION (kept the base team)
- [suspicious_name] (BASE CARDS I GOLDEN MIRROR IMAGE VARIATION, line 437) Odd casing "DeMAR DeROZAN" normalized to "DeMar DeRozan"
- [player_mismatch] (BASE CARDS I CLEAR VARIATION, line 598) #51: base "Obi Toppin" vs "Pascal Siakam" in BASE CARDS I CLEAR VARIATION
- [player_mismatch] (BASE CARDS I CLEAR VARIATION, line 600) #53: base "Pascal Siakam" vs "Obi Toppin" in BASE CARDS I CLEAR VARIATION
- [team_mismatch] (BASE CARDS I CLEAR VARIATION, line 806) #259 Kareem Abdul-Jabbar: base "Milwaukee Bucks" vs "Los Angeles Lakers" in BASE CARDS I CLEAR VARIATION (kept the base team)
- [player_mismatch] (BASE CARDS I TEAM COLOR BORDER VARIATION, line 902) #51: base "Obi Toppin" vs "Pascal Siakam" in BASE CARDS I TEAM COLOR BORDER VARIATION
- [player_mismatch] (BASE CARDS I TEAM COLOR BORDER VARIATION, line 904) #53: base "Pascal Siakam" vs "Obi Toppin" in BASE CARDS I TEAM COLOR BORDER VARIATION
- [suspicious_name] (BASE CARDS I BLACKOUT VARIATION, line 1321) Odd casing "DeMAR DeRozan" normalized to "DeMar DeRozan"
- [name_variant] (BASE CARDS I BLACKOUT VARIATION, line 1332) #173: "P.J. Washington Jr." vs "P.J. Washington" in BASE CARDS I BLACKOUT VARIATION (kept the base spelling)
- [non_player_row] (COMBO CARDS BLACKOUT VARIATION, line 1501) Not a player row, skipped for the MVP (team cards are not modeled): "WE THE NORTH RAPTORS SHINE" (Toronto Raptors)

## Skipped sections (out of MVP scope)

- INSERT / THE DAILY DRIBBLE: 40 rows
- INSERT / NEW SCHOOL: 141 rows
- INSERT / LEVITATION: 20 rows
- INSERT / NO LIMIT: 40 rows
- INSERT / STARS OF THE NBA: 30 rows
- INSERT / RISE TO STARDOM: 20 rows
- INSERT / MVP VAULT: 10 rows
- INSERT / COMIC COURT: 20 rows
- INSERT / HOME COURT: 10 rows
- INSERT / SONIC BOOM: 20 rows
- INSERT / SOLE AMBITION: 51 rows
- INSERT / GENERATION NOW: 30 rows
- INSERT / POWER PLAYERS: 20 rows
- INSERT / CLUTCH CITY PROSPECTS: 10 rows
- INSERT / ALL KINGS: 25 rows
- INSERT / HARDWOOD STARS: 20 rows
- INSERT / COMPANION TOPPS CARDS: 16 rows
- INSERT / COMPANION TOPPS CARDS SHORT PRINTS: 5 rows
- INSERT / OVERSIZED TOPPS CARDS: 16 rows
- INSERT / OVERSIZED TOPPS CARDS SHORT PRINTS: 5 rows
- INSERT / SCAN AND SLAM: 50 rows
- INSERT / SOCIAL MEDIA FOLLOWBACK REDEMPTION: 10 rows
- INSERT / LIMITED STOCK LEGENDS: 50 rows
- INSERT / CLASS OF 25: 20 rows
- INSERT / BIG BOX BALLERS: 150 rows
- INSERT / FANATICS AUTHENTIC REDEMPTIONS: 30 rows
- AUTOGRAPH / FLAGSHIP REAL ONE AUTOGRAPHS: 133 rows
- AUTOGRAPH / MARKS OF EXCELLENCE: 38 rows
- AUTOGRAPH / CONTEMPORARY MARKS: 37 rows
- AUTOGRAPH / HAVOC MARKS: 19 rows
- AUTOGRAPH / TOPPS NOTCH SIGNATURES: 38 rows
- AUTOGRAPH / NEW APPLICANTS AUTOGRAPHS: 38 rows
- AUTOGRAPH / SIGNED AND SEALED: 19 rows
- AUTOGRAPH / ROOKIE PHOTO SHOOT AUTOGRAPHS: 81 rows
- AUTOGRAPH / FLAGSHIP REAL ONE ROOKIE AUTOGRAPHS: 70 rows
- AUTOGRAPH / ROOKIE PHOTO SHOOT DUAL AUTOGRAPH: 20 rows
- AUTOGRAPH / RETAIL RUSH SIGNATURES: 91 rows
- AUTOGRAPH / SHOPPING SPREE SIGNATURES: 39 rows
- AUTOGRAPH / FLAGSHIP REAL ONE AUTOGRAPHS SPIKE LEE: 1 rows
- RELIC / RISE TO THE OCCASION RELICS: 39 rows
- RELIC / OWN THE GAME: 40 rows
- RELIC / ROOKIE ROUNDBALL REMNANTS: 20 rows
- RELIC / FRANCHISE FABRICS: 39 rows
- RELIC / SWISH AND STITCH RELICS: 40 rows
- RELIC / WOVEN WONDERS RELICS: 20 rows
- RELIC / FLAGSHIP REAL ONE RELIC: 50 rows
- RELIC / STORE EXCLUSIVE RELICS: 50 rows
- RELIC / RETAIL RIPPER RELICS: 50 rows

## Import (2025-26-topps-basketball.csv)

Last run 2026-10-07. Player names that were not an exact match of an
existing player. "merged" rows were attached to the existing player and recorded as aliases;
"suffix" and "ambiguous" rows created a player to confirm; "new" names were not close to any
existing player. Add a typo to player-aliases.csv once it is confirmed to be a known player.

- new (260): "Jaylen Brown", "Kristaps Porzingis", "Payton Pritchard", "Baylor Scheierman", "Derrick White", "Jrue Holiday", "D'Angelo Russell", "Ziaire Williams", "Nic Claxton", "Cam Thomas", "Jalen Wilson", "Cameron Johnson", "Jalen Brunson", "OG Anunoby", "Josh Hart", "Miles McBride", "Mikal Bridges", "Karl-Anthony Towns", "Tyler Kolek", "Tyrese Maxey", "Joel Embiid", "Paul George", "Jared McCain", "Quentin Grimes", "Guerschon Yabusele", "Kelly Oubre Jr.", "Gradey Dick", "Jonathan Mogbo", "Brandon Ingram", "Scottie Barnes", "Immanuel Quickley", "RJ Barrett", "Coby White", "Josh Giddey", "Nikola Vučević", "Matas Buzelis", "Patrick Williams", "Lonzo Ball", "Cade Cunningham", "Jalen Duren", "Ron Holland II", "Malik Beasley", "Ausar Thompson", "Jaden Ivey", "Marcus Sasser", "Tyrese Haliburton", "Bennedict Mathurin", "Myles Turner", "Jarace Walker", "Obi Toppin", "Andrew Nembhard", "Pascal Siakam", "Giannis Antetokounmpo", "Damian Lillard", "Kyle Kuzma", "AJ Green", "Brook Lopez", "Gary Trent Jr.", "Tyler Smith", "Trae Young", "Zaccharie Risacher", "Clint Capela", "Dyson Daniels", "Jalen Johnson", "Onyeka Okongwu", "LaMelo Ball", "Brandon Miller", "Miles Bridges", "Mark Williams", "Tidjane Salaün", "Nick Smith Jr.", "Tyler Herro", "Kel'El Ware", "Bam Adebayo", "Nikola Jović", "Andrew Wiggins", "Jaime Jaquez Jr.", "Pelle Larsson", "Donovan Mitchell", "Darius Garland", "Evan Mobley", "Ty Jerome", "Max Strus", "Jarrett Allen", "Jaylon Tyson", "Paolo Banchero", "Franz Wagner", "Anthony Black", "Wendell Carter Jr.", "Cole Anthony", "Jalen Suggs", "Tristan Da Silva", "Jordan Poole", "Bilal Coulibaly", "Alex Sarr", "Bub Carrington", "Kyshawn George", "AJ Johnson", "Khris Middleton", "Christian Braun", "Jamal Murray", "Russell Westbrook", "Michael Porter Jr.", "Peyton Watson", "Jalen Pickett", "Naz Reid", "Julius Randle", "Rudy Gobert", "Mike Conley", "Terrence Shannon Jr.", "Rob Dillingham", "Jalen Williams", "Luguentz Dort", "Chet Holmgren", "Cason Wallace", "Isaiah Hartenstein", "Isaiah Joe", "Scoot Henderson", "Anfernee Simons", "Deandre Ayton", "Deni Avdija", "Donovan Clingan", "Shaedon Sharpe", "Toumani Camara", "Lauri Markkanen", "Cody Williams", "Keyonte George", "Jordan Clarkson", "Isaiah Collier", "Kyle Filipowski", "Jimmy Butler III", "Draymond Green", "Jonathan Kuminga", "Quinten Post", "Moses Moody", "Brandin Podziemski", "Kawhi Leonard", "James Harden", "Norman Powell", "Ivica Zubac", "Nicolas Batum", "Ben Simmons", "Derrick Jones Jr.", "Dorian Finney-Smith", "LeBron James", "Austin Reaves", "Bronny James Jr.", "Dalton Knecht", "Rui Hachimura", "Jarred Vanderbilt", "Devin Booker", "Kevin Durant", "Bradley Beal", "Ryan Dunn", "Oso Ighodaro", "Grayson Allen", "DeMar DeRozan", "Zach Lavine", "Malik Monk", "Devin Carter", "Keegan Murray", "Domantas Sabonis", "Kyrie Irving", "Anthony Davis", "Klay Thompson", "Brandon Williams", "Dereck Lively II", "P.J. Washington Jr.", "Max Christie", "Jalen Green", "Amen Thompson", "Jabari Smith Jr.", "Reed Sheppard", "Tari Eason", "Alperen Sengun", "Dillon Brooks", "Ja Morant", "Jaylen Wells", "Jaren Jackson Jr.", "Desmond Bane", "Zach Edey", "Santi Aldama", "Yuki Kawamura", "Herbert Jones", "Trey Murphy III", "Yves Missi", "Dejounte Murray", "CJ McCollum", "Jordan Hawkins", "De'Aaron Fox", "Stephon Castle", "Chris Paul", "Jeremy Sochan", "Keldon Johnson", "Kon Knueppel", "Tre Johnson III", "Jeremiah Fears", "Egor Dëmin", "Collin Murray-Boyles", "Khaman Maluach", "Cedric Coward", "Noa Essengue", "Derik Queen", "Carter Bryant", "Thomas Sorber", "Yang Hansen", "Joan Beringer", "Walter Clayton Jr.", "Nolan Traore", "Kasparas Jakučionis", "Will Riley", "Drake Powell", "Asa Newell", "Nique Clifford", "Jase Richardson", "Ben Saraf", "Danny Wolf", "Hugo González", "Liam McNeeley", "Yanic Konan-Niederhäuser", "Rasheer Fleming", "Noah Penda", "Sion James", "Ryan Kalkbrenner", "Johni Broome", "Adou Thiero", "Buddy Hield", "Chaz Lanier", "Kam Jones", "Alijah Martin", "Micah Peavy", "Koby Brea", "Maxime Raynaud", "Jamir Watkins", "Brooks Barnhizer", "Naji Marshall", "Ochai Agbaji", "Jaden McDaniels", "GG Jackson II", "Tyrese Proctor", "Bill Russell", "Dirk Nowitzki", "Allen Iverson", "Kevin Garnett", "Magic Johnson", "Carmelo Anthony", "Larry Bird", "Rick Barry", "Kareem Abdul-Jabbar", "Shaquille O'Neal", "Dwyane Wade", "Manu Ginobili", "Tracy McGrady", "John Stockton", "George Gervin", "Spud Webb", "Steve Kerr", "Bernard King", "Isiah Thomas", "Detlef Schrempf"

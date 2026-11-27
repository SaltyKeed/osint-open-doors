# Mesures du panel

Ce fichier suit l'efficacité de l'outil d'une version à l'autre (T11). Le
panel est formé de volontaires qui ont donné leur accord : pour l'instant
Tiago et Enzo. Seuls des nombres sont notés ici, jamais une donnée trouvée.

## Critère de réussite

| Mesure | Seuil |
| --- | --- |
| Champs de la fiche remplis (confirmé ou probable), en moyenne sur le panel | Au moins 25 % des 30 champs |
| Ville de résidence (C1) trouvée | Pour au moins la moitié du panel |

## Méthode

1. Chaque membre du panel saisit les mêmes informations à chaque mesure
   (email, téléphone, pseudo, prénom et nom), dans le panneau « Enquête
   complète » de la console `/dev`.
2. Les comptes « à confirmer » sont confirmés ou refusés par la personne
   elle-même, puis le deuxième tour est lancé.
3. On note, par personne : le nombre de champs remplis (confirmé, probable),
   C1 trouvé ou non, et le nombre de constats par source.
4. Rien d'autre n'est noté. Les résultats affichés sont effacés à la fin.

## Résultats

| Date | Version (commit) | Personne | Champs confirmés | Champs probables | Taux | C1 trouvé | Remarques |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 27.11.2026 | main à 10h26 | Tiago | H(1) et I(1) | 0 | 7% | Non | On trouve les fuites par xposedornot et c'est tout, rien d'autre n'est trouvé |
| 27.11.2026 | main à 10h26 | Enzo | I(1) et F(1) | 0 | 7% | Non | La présence en ligne a du être confirmée à la main |
| 27.11.2026 | feat/dorks | Tiago | H(1) et I(1) | 0 | 7% | Non | Un des champs confirmés n'était pas moi, c'était un PDF qui contenait des noms me ressemblant mais c'était pas moi |

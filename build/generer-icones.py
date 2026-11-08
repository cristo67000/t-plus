# -*- coding: utf-8 -*-
"""Génère les icônes de T+ et l'image d'aperçu des liens partagés.

Dessin : sur un parchemin, une croix pattée rouge — celle que l'on prête aux
Templiers — et, en petit, le « + » du nom. Le même dessin que le logo de la
page (index.html).

    python build/generer-icones.py
"""
import os

from PIL import Image, ImageDraw, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(os.path.dirname(ICI), "icons")
PAPIER = (246, 241, 231)
PAPIER_SOMBRE = (232, 223, 205)
ROUGE = (167, 50, 47)
ENCRE = (36, 28, 22)
OR = (156, 124, 43)
E = 4

POLICES_TITRE = [r"C:\Windows\Fonts\constanb.ttf", r"C:\Windows\Fonts\cambriab.ttf", r"C:\Windows\Fonts\georgiab.ttf"]
POLICES_TEXTE = [r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"]


def police(chemins, taille):
    for chemin in chemins:
        if os.path.exists(chemin):
            return ImageFont.truetype(chemin, taille)
    return ImageFont.load_default()


def croix(d, cx, cy, u, couleur=ROUGE):
    """La croix pattée : quatre branches évasées, dessinées comme des polygones.
    u : l'unité (le dessin fait 64 unités de côté, centré en cx, cy)."""
    def p(x, y):
        return (cx + (x - 32) * u, cy + (y - 32) * u)
    # une branche vers le haut : du centre (étroit) vers le bord (large), aux bouts concaves
    branche = [(32, 32), (27, 24), (23, 10), (32, 14), (41, 10), (37, 24)]
    for k in range(4):
        pts = []
        for (x, y) in branche:
            x0, y0 = x - 32, y - 32
            for _ in range(k):
                x0, y0 = -y0, x0
            pts.append(p(x0 + 32, y0 + 32))
        d.polygon(pts, fill=couleur)


def icone(cote, masquable=False):
    g = cote * E
    image = Image.new("RGBA", (g, g), (0, 0, 0, 0))
    d = ImageDraw.Draw(image)
    if masquable:
        d.rectangle([0, 0, g, g], fill=PAPIER)
        croix(d, g / 2, g / 2, g / 64 * 0.68)
    else:
        rayon = g * 14 / 64
        d.rounded_rectangle([g * 2 / 64, g * 2 / 64, g * 62 / 64, g * 62 / 64], radius=rayon, fill=PAPIER)
        d.rounded_rectangle([g * 2 / 64, g * 2 / 64, g * 62 / 64, g * 62 / 64], radius=rayon, outline=PAPIER_SOMBRE, width=max(1, g // 64))
        croix(d, g / 2, g / 2, g / 64 * 0.92)
    return image.resize((cote, cote), Image.LANCZOS)


def apercu():
    L, H = 1200, 630
    g = Image.new("RGB", (L * 2, H * 2), PAPIER)
    d = ImageDraw.Draw(g)
    for y in range(H * 2):
        t = y / (H * 2)
        c = tuple(round(PAPIER[i] * (1 - t) + PAPIER_SOMBRE[i] * t) for i in range(3))
        d.line([(0, y), (L * 2, y)], fill=c)
    croix(d, 330, H, 8.2)
    titre = police(POLICES_TITRE, 190)
    texte = police(POLICES_TEXTE, 56)
    d.text((640, 250), "T+", font=titre, fill=ROUGE)
    d.text((900, 300), "les Templiers", font=police(POLICES_TITRE, 110), fill=ENCRE)
    lignes = ["L’ordre du Temple de 1119 à 1314 : articles", "illustrés et vérifiés, frise des maîtres, cartes", "des commanderies et des châteaux, légendes au crible."]
    y = 560
    for l in lignes:
        d.text((646, y), l, font=texte, fill=(82, 70, 59))
        y += 78
    d.text((646, 880), "cristo67000.github.io/t-plus — hors ligne, sans compte, sans publicité", font=police(POLICES_TEXTE, 40), fill=OR)
    return g.resize((L, H), Image.LANCZOS)


def main():
    os.makedirs(SORTIE, exist_ok=True)
    icone(192).save(os.path.join(SORTIE, "icon-192.png"))
    icone(512).save(os.path.join(SORTIE, "icon-512.png"))
    icone(512, masquable=True).save(os.path.join(SORTIE, "icon-maskable-512.png"))
    apercu().save(os.path.join(SORTIE, "apercu-1200x630.png"), optimize=True)
    print("icônes écrites dans", SORTIE)


if __name__ == "__main__":
    main()

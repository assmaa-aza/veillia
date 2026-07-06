import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-gradient-brand">VeillIA</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Votre plateforme de veille intelligente sur l'écosystème IA.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Produit</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/decouvrir" className="hover:text-foreground">Découvrir</Link></li>
            <li><Link to="/categories/$slug" params={{ slug: "tendances" }} className="hover:text-foreground">Tendances</Link></li>
            <li><Link to="/categories/$slug" params={{ slug: "evenements" }} className="hover:text-foreground">Événements</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Entreprise</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/a-propos" className="hover:text-foreground">À propos</Link></li>
            <li><a href="#contact" className="hover:text-foreground">Contact</a></li>
            <li><a href="#" className="hover:text-foreground">LinkedIn</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Légal</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Politique de confidentialité</a></li>
            <li><a href="#" className="hover:text-foreground">Conditions</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} VeillIA. Tous droits réservés.
      </div>
    </footer>
  );
}

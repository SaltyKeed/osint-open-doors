"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Type-only imports: erased at build time, no server code reaches the browser.
import type { Action } from "@/server/domain/actions";
import type {
  AccountFinding,
  BreachFinding,
  CountFinding,
  DataCategory,
  DirectoryFinding,
  Finding,
  ProfileFinding,
  WebFinding,
} from "@/server/domain/types";

type SearchResponse = {
  mode: "surface" | "deep";
  searched: { email?: string; phone?: string; name?: string; username?: string };
  findings: Finding[];
  actions: Action[];
  failedProviders: string[];
};

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: SearchResponse };

type FormState = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  username: string;
  city: string;
  birthYear: string;
};
const EMPTY_FORM: FormState = { email: "", phone: "", firstName: "", lastName: "", username: "", city: "", birthYear: "" };

const CATEGORY_LABELS: Record<DataCategory, string> = {
  email: "Email",
  password: "Mot de passe",
  name: "Nom",
  phone: "Téléphone",
  address: "Adresse",
  birthDate: "Date de naissance",
  username: "Pseudo",
  photo: "Photo",
  ipAddress: "Adresse IP",
  financial: "Données bancaires",
  governmentId: "Pièce d'identité",
  location: "Localité",
  other: "Autre",
};

const PROVIDER_LABELS: Record<string, string> = {
  xposedornot: "XposedOrNot",
  tavily: "Recherche web",
  searchch: "Annuaire search.ch",
  github: "GitHub",
  gravatar: "Gravatar",
  pgp: "Serveur de clés PGP",
  rdap: "Registre des domaines",
  whatsmyname: "Vérification des pseudos",
  orcid: "ORCID",
  wikidata: "Wikidata",
  wayback: "Archives du web",
};

// After this delay without interaction, everything is erased for the next visitor.
const INACTIVITY_MS = 2 * 60 * 1000;

export function SearchApp() {
  // State lives in memory only: no localStorage, no cookie (CLAUDE.md invariant).
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const reset = useCallback(() => {
    setForm(EMPTY_FORM);
    setConsent(false);
    setStatus({ kind: "idle" });
  }, []);

  useEffect(() => {
    let timer = setTimeout(reset, INACTIVITY_MS);
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(reset, INACTIVITY_MS);
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, restart));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, restart));
    };
  }, [reset]);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const hasInput = Boolean(form.email || form.phone || (form.firstName && form.lastName) || form.username);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "loading" });
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consent }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { fields?: string[] };
        const message = body.fields?.includes("phone")
          ? "Le numéro de téléphone n'est pas valide."
          : body.fields?.includes("email")
            ? "L'adresse email n'est pas valide."
            : body.fields?.includes("username")
              ? "Le pseudo doit faire 3 à 40 caractères (lettres, chiffres, . _ -)."
              : body.fields?.includes("birthYear")
                ? "L'année de naissance doit avoir 4 chiffres (par exemple 2008)."
                : "Saisie invalide. Remplis au moins un champ (prénom et nom ensemble).";
        setStatus({ kind: "error", message });
        return;
      }
      setStatus({ kind: "done", result: (await response.json()) as SearchResponse });
    } catch {
      setStatus({ kind: "error", message: "La recherche n'a pas abouti. Réessaie." });
    }
  }

  if (status.kind === "done") {
    return <Results result={status.result} onReset={reset} />;
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Qu&apos;est-ce qu&apos;on trouve sur toi ?</CardTitle>
        <CardDescription>
          Remplis ce que tu veux tester. Plus tu donnes d&apos;informations, plus la recherche va loin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5" autoComplete="off">
          <Field id="email" label="Adresse email" type="email" value={form.email} onChange={update("email")} />
          <Field id="phone" label="Téléphone" type="tel" value={form.phone} onChange={update("phone")} placeholder="079 123 45 67" />
          <div className="grid grid-cols-2 gap-3">
            <Field id="firstName" label="Prénom" value={form.firstName} onChange={update("firstName")} />
            <Field id="lastName" label="Nom" value={form.lastName} onChange={update("lastName")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="city" label="Localité (optionnel)" value={form.city} onChange={update("city")} placeholder="aide à reconnaître tes pages" />
            <Field id="birthYear" label="Année de naissance (optionnel)" value={form.birthYear} onChange={update("birthYear")} placeholder="2008" />
          </div>
          <Field id="username" label="Pseudo (optionnel)" value={form.username} onChange={update("username")} placeholder="celui que tu utilises sur les réseaux" />
          <div className="flex items-start gap-3">
            <Checkbox id="consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
            <Label htmlFor="consent" className="leading-snug font-normal">
              Je confirme que ces informations sont les miennes. Elles sont envoyées pour la recherche à
              XposedOrNot, Tavily, search.ch, GitHub, Gravatar, keys.openpgp.org, Keybase, ORCID,
              Wikidata et au registre des domaines ; le pseudo et la partie de l&apos;email avant le @
              sont testés sur environ 650 sites publics. Les pages trouvées sont vérifiées dans les
              archives du web (Internet Archive). Tout est ensuite effacé, rien n&apos;est enregistré.
            </Label>
          </div>
          {status.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          )}
          <Button type="submit" disabled={!consent || !hasInput || status.kind === "loading"}>
            {status.kind === "loading" ? "Recherche en cours… (jusqu'à 25 secondes)" : "Lancer la recherche"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        autoComplete="off"
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
      />
    </div>
  );
}

function Results({ result, onReset }: { result: SearchResponse; onReset: () => void }) {
  const byKind = <K extends Finding["kind"]>(kind: K) =>
    result.findings.filter((f): f is Extract<Finding, { kind: K }> => f.kind === kind);

  const breaches = byKind("breach");
  const web = byKind("web").filter((f) => f.verified);
  const nameOnlyPages = byKind("web").filter((f) => !f.verified);
  const directory = byKind("directory");
  const accounts = byKind("account");
  const counts = byKind("count");
  const profiles = byKind("profile");
  const linked = breaches.length + web.length + directory.length + accounts.length + profiles.length;
  const deletedButArchived = byKind("web").filter((f) => f.live === "gone" && f.archive).length;
  const searched = [result.searched.email, result.searched.phone, result.searched.name, result.searched.username].filter(Boolean);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">
          {linked === 0
            ? "Rien de public n'est relié à tes informations"
            : `${linked} élément${linked > 1 ? "s" : ""} public${linked > 1 ? "s" : ""} relié${linked > 1 ? "s" : ""} à toi`}
        </h2>
        <p className="text-sm text-muted-foreground">Recherche pour : {searched.join(" · ")}</p>
        {deletedButArchived > 0 && (
          <p className="text-sm font-medium">
            {deletedButArchived} page{deletedButArchived > 1 ? "s" : ""} supprimée{deletedButArchived > 1 ? "s" : ""} du web{" "}
            {deletedButArchived > 1 ? "restent lisibles" : "reste lisible"} dans les archives d&apos;Internet.
          </p>
        )}
        {result.failedProviders.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Sans réponse : {result.failedProviders.map((id) => PROVIDER_LABELS[id] ?? id).join(", ")}. Le
            résultat peut être incomplet.
          </p>
        )}
      </div>

      {result.actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ton plan d&apos;action</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-3 pl-5">
              {result.actions.map((action) => (
                <li key={action.id}>
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-muted-foreground">{action.detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {directory.length > 0 && <DirectorySection items={directory} />}
      {accounts.length > 0 && <AccountsSection items={accounts} />}
      {profiles.length > 0 && <ProfileSection items={profiles} />}
      {web.length > 0 && <WebSection items={web} />}
      {breaches.length > 0 && <BreachSection items={breaches} />}
      {nameOnlyPages.length > 0 && <NameSection items={nameOnlyPages} />}
      {counts.length > 0 && <CountSection items={counts} />}

      <div className="flex items-center justify-between">
        <Button onClick={onReset} size="lg">
          Effacer et terminer
        </Button>
        {/* Active mode shown discreetly to check the kiosk on the event day (D10, rule 4). */}
        <span className="text-xs text-muted-foreground">mode {result.mode}</span>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Categories({ categories }: { categories: DataCategory[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((category) => (
        <Badge key={category} variant={category === "password" ? "destructive" : "secondary"}>
          {CATEGORY_LABELS[category]}
        </Badge>
      ))}
    </div>
  );
}

function DirectorySection({ items }: { items: DirectoryFinding[] }) {
  return (
    <Section title="Annuaire téléphonique" description="N'importe qui peut retrouver ces informations à partir de ton numéro.">
      {items.map((item, index) => (
        <Card key={index} size="sm">
          <CardHeader>
            <CardTitle>{item.source}</CardTitle>
            <CardDescription>
              {item.noPromo
                ? "Ton inscription porte l'astérisque : pas de démarchage publicitaire."
                : "Pas d'astérisque : ton numéro peut être utilisé pour du démarchage."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Categories categories={item.categories} />
          </CardContent>
        </Card>
      ))}
    </Section>
  );
}

function AccountsSection({ items }: { items: AccountFinding[] }) {
  return (
    <Section title="Comptes et traces publiques" description="Services où ton adresse email laisse une trace visible.">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.service} size="sm">
            <CardHeader>
              <CardTitle>{item.service}</CardTitle>
              <CardDescription>{item.summary}</CardDescription>
            </CardHeader>
            {item.categories.length > 0 && (
              <CardContent>
                <Categories categories={item.categories} />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </Section>
  );
}

function WebPageList({ items }: { items: WebFinding[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.url} className="flex flex-col gap-0.5">
          <span className="font-medium">
            {item.probable && (
              <Badge className="mr-2 align-middle">Probablement toi ({item.probableBecause})</Badge>
            )}
            {item.title}
          </span>
          <span className="text-xs break-all text-muted-foreground">{item.url}</span>
          {item.snippet && <span className="text-sm">{item.snippet}</span>}
          <ArchiveLine item={item} />
        </li>
      ))}
    </ul>
  );
}

function ArchiveLine({ item }: { item: WebFinding }) {
  const deleted = item.live === "gone";
  if (!item.archive && !deleted) return null;
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      {deleted && <Badge variant="destructive">Supprimée du site</Badge>}
      {item.archive && (
        <span className="text-muted-foreground">
          Archivée {item.archive.firstYear === item.archive.lastYear ? `en ${item.archive.firstYear}` : `de ${item.archive.firstYear} à ${item.archive.lastYear}`}
          {deleted ? " : toujours lisible dans l'archive" : ""} ·{" "}
          <span className="break-all">{item.archive.snapshotUrl}</span>
        </span>
      )}
    </span>
  );
}

function WebSection({ items }: { items: WebFinding[] }) {
  return (
    <Section
      title={`Sur le web : pages vérifiées (${items.length})`}
      description="Ces pages contiennent vraiment ton email ou ton numéro : elles parlent de toi."
    >
      <Card size="sm">
        <CardContent>
          <WebPageList items={items} />
        </CardContent>
      </Card>
    </Section>
  );
}

function NameSection({ items }: { items: WebFinding[] }) {
  const sites = [...new Set(items.map((i) => i.site))];
  const probable = items.filter((i) => i.probable).length;
  return (
    <Section
      title={`Avec ton nom et prénom (${items.length} pages, non vérifiées${probable > 0 ? `, dont ${probable} probablement toi` : ""})`}
      description={`Ce que n'importe qui trouve en cherchant ton nom, y compris avec ton initiale (« E. Nom »). Ces pages ne contiennent ni ton email ni ton numéro : certaines parlent peut-être d'un homonyme. « Probablement toi » : la page contient aussi ta localité ou ton année de naissance. Les emails et numéros qu'elles contiennent sont masqués. Sites : ${sites.join(", ")}.`}
    >
      <Card size="sm">
        <CardContent>
          <WebPageList items={items} />
        </CardContent>
      </Card>
    </Section>
  );
}

function ProfileSection({ items }: { items: ProfileFinding[] }) {
  const groups = new Map<string, ProfileFinding[]>();
  for (const item of items) {
    const key = `${item.username}|${item.origin}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <Section
      title={`Comptes trouvés avec un pseudo (${items.length})`}
      description="Un compte existe avec ce pseudo sur ces sites. Le même pseudo peut appartenir à quelqu'un d'autre : vérifie toi-même. Liste des sites : WhatsMyName (CC BY-SA 4.0)."
    >
      {[...groups.values()].map((group) => {
        const first = group[0];
        if (!first) return null;
        return (
          <Card key={`${first.username}-${first.origin}`} size="sm">
            <CardHeader>
              <CardTitle>@{first.username}</CardTitle>
              <CardDescription>
                {first.origin === "pseudo" ? "Pseudo que tu as saisi" : `Rebond : pseudo trouvé dans ${first.origin}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1.5">
                {group.map((item) => (
                  <li key={item.url} className="flex flex-col">
                    <span className="text-sm font-medium">
                      {item.site} <span className="font-normal text-muted-foreground">· {item.category}</span>
                    </span>
                    <span className="text-xs break-all text-muted-foreground">{item.url}</span>
                    {item.archive && (
                      <span className="text-xs text-muted-foreground">
                        Archivé de {item.archive.firstYear} à {item.archive.lastYear}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </Section>
  );
}

function BreachSection({ items }: { items: BreachFinding[] }) {
  return (
    <Section
      title={`Fuites de données (${items.length})`}
      description="Services piratés dont les données ont été publiées. Seuls les types de données sont affichés."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={`${item.providerId}-${item.source}`} size="sm">
            <CardHeader>
              <CardTitle>{item.source}</CardTitle>
              <CardDescription>
                {[item.year, item.records && `${item.records.toLocaleString("fr-CH")} comptes`].filter(Boolean).join(" · ")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Categories categories={item.categories} />
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function CountSection({ items }: { items: CountFinding[] }) {
  return (
    <Section
      title="Annuaire : recherche par nom"
      description="Pour la recherche par nom, l'annuaire search.ch ne donne que le nombre d'inscriptions (condition de notre clé API)."
    >
      <Card size="sm">
        <CardContent>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.providerId}>
                <span className="font-semibold">{item.count}</span> {item.label} ({item.source})
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Section>
  );
}

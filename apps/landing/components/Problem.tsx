import { Card, CardBody, PersonIcon, ClipboardIcon, BuildingIcon } from "@passport/design-system/components";

const personas = [
  {
    label: "If you're a patient",
    headline: "Today you have two bad options.",
    body: "Hand over your entire medical record — dozens of markers plus everything that identifies you — to prove one fact. Or state the fact yourself, and be disbelieved.",
    Icon: PersonIcon,
  },
  {
    label: "If you're a trial coordinator",
    headline: "Screening is a human bottleneck.",
    body: "Manual chart review is slow. Sending records to outside AI tools to speed it up creates HIPAA and GDPR exposure no institution will accept — so it stays slow.",
    Icon: ClipboardIcon,
  },
  {
    label: "If you're a health system",
    headline: "Every disclosure is a liability you keep.",
    body: "Letting patients act on their own data elsewhere is the right thing to do — but every external release remains your risk. So the default is release everything, or nothing.",
    Icon: BuildingIcon,
  },
];

export function Problem() {
  return (
    <section id="problem" className="border-b border-gray-200 bg-gray-50 py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-display-sm">
            There&apos;s no way to disclose just one fact.
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            No reusable credential layer exists. Every relationship — each insurer, employer,
            trial, platform — starts from zero, with a fresh, all-or-nothing disclosure.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {personas.map((p) => (
            <Card
              key={p.label}
              className="h-full transition-all duration-base ease-out hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardBody className="flex h-full flex-col gap-3 py-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <p.Icon className="h-5 w-5" />
                </div>
                <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {p.label}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{p.headline}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{p.body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

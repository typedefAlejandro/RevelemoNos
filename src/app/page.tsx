const cursos = [
  { sigla: "CCO", nome: "Ciência da Computação" },
  { sigla: "CDA", nome: "Ciência de Dados Aplicada" },
  { sigla: "ECO", nome: "Engenharia da Computação" },
  { sigla: "SIN", nome: "Sistemas de Informação" },
  { sigla: "PÓS", nome: "Pós-graduação" },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 font-sans sm:px-6">
      <div className="w-full max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          DACOMP · UNIFEI
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">
          Revelemo-nos
        </h1>
        <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
          A vitrine dos projetos criados por alunos e professores da
          Computação da UNIFEI — para a gente se conhecer e ser visto.
        </p>

        <ul className="mt-10 flex flex-wrap justify-center gap-2">
          {cursos.map((c) => (
            <li
              key={c.sigla}
              title={c.nome}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium dark:border-neutral-700"
            >
              {c.sigla}
            </li>
          ))}
        </ul>

        <p className="mt-12 inline-block rounded-lg bg-neutral-100 px-5 py-3 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          Em breve. Estamos construindo — o código é aberto e você pode
          contribuir.
        </p>
      </div>
    </main>
  );
}

export const solutions = [
    {
        id: "01",
        title: "Landing Pages & CMS",
        description: "Experiências digitais de alta conversão com gerenciamento de conteúdo e arquitetura preparada para crescimento.",
        icon: "LayoutTemplate",
    },
    {
        id: "02",
        title: "Plataformas SaaS",
        description: "Sistemas completos, dashboards, painéis administrativos e produtos digitais escaláveis.",
        icon: "AppWindow",
    },
    {
        id: "03",
        title: "APIs & Integrações",
        description: "Integrações entre sistemas, gateways de pagamento, CRMs, automações e serviços externos.",
        icon: "Code2",
    },
    {
        id: "04",
        title: "Infraestrutura & DevOps",
        description: "Docker, cloud, CI/CD, monitoramento, segurança, escalabilidade e alta disponibilidade.",
        icon: "Server",
    },
];

export const methodologyFiles = [
    { step: "01", title: "Discovery", description: "Entendimento do problema, negócio e objetivos." },
    { step: "02", title: "Arquitetura", description: "Definição da solução técnica e stack." },
    { step: "03", title: "UX/UI", description: "Construção da experiência e interface visual." },
    { step: "04", title: "Desenvolvimento", description: "Implementação utilizando boas práticas." },
    { step: "05", title: "QA", description: "Testes, validação e refinamento técnico." },
    { step: "06", title: "Deploy", description: "Publicação, infraestrutura e monitoramento." },
    { step: "07", title: "Evolução", description: "Manutenção, melhorias contínuas e escala." },
];

export const casesItems = [
    {
        imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop",
        name: "Ink Studio Manager",
        category: "Cloud SaaS",
        description: "Gestor de estúdios robusto com hospedagem Vercel (Serverless), banco Neon Postgres e armazenamento de mídia AWS-like (Cloudinary).",
        techStack: ["Django", "Python", "PostgreSQL", "Vercel"],
        href: "https://github.com/kauaxp77",
    },
    {
        imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop",
        name: "Medclin Platform",
        category: "Corporate System",
        description: "Sistema hospitalar e clínico completamente encapsulado usando arquitetura Dockerizada para consistência total entre ambientes.",
        techStack: ["Docker", "Java", "Spring Boot", "MySQL"],
        href: "https://github.com/kauaxp77",
    },
    {
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop",
        name: "CMS 3D Luxury Portfolio",
        category: "Web Platform",
        description: "Plataforma Premium para fotógrafos com renderização 3D, CMS seguro p/ gerenciar portfólio dinâmico e logs de auditoria pesados.",
        techStack: ["Next.js", "Java Backend", "Tailwind", "Three.js"],
        href: "https://github.com/kauaxp77",
    },
];

export const blogPosts = [
    {
        slug: "deploy-django-vercel",
        title: "Deploy Extremo: Levando Django Serverless para a Vercel com Neon DB",
        excerpt: "Um guia prático sobre como solucionar problemas de read-only filesystem configurando buckets e bancos de dados modernizados.",
        category: "Cloud Architecture",
        date: "17 Ago 2026",
        readingTime: "5 min de leitura",
        coverImage: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&auto=format&fit=crop",
    },
    {
        slug: "dockerizando-aplicacoes-java",
        title: "Dockerizando Aplicações Spring Boot para Produção",
        excerpt: "Aprenda a construir Dockerfiles eficientes para Java, isolando completamente suas dependências de SO e tornando seu software inquebrável.",
        category: "DevOps",
        date: "15 Ago 2026",
        readingTime: "7 min de leitura",
        coverImage: "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800&auto=format&fit=crop",
    },
    {
        slug: "automacao-pje-python",
        title: "Automação Jurídica (RPA) com Selenium e Python",
        excerpt: "Como hackear processos cansativos e raspar o sistema do tribunal PJe para economizar centenas de horas de advogados.",
        category: "Engenharia de Software",
        date: "14 Ago 2026",
        readingTime: "4 min de leitura",
        coverImage: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&auto=format&fit=crop",
    },
];

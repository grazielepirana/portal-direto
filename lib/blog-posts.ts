import { supabase } from "./supabase";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  published: boolean;
  sort_order: number;
  updated_at?: string;
};

export const DEFAULT_BLOG_POSTS: BlogPost[] = [
  {
    id: "blog-1",
    slug: "como-vender-seu-imovel-mais-rapido-10-dicas-que-realmente-funcionam",
    title: "Como vender seu imóvel mais rápido: 10 dicas que realmente funcionam",
    excerpt: "Ações práticas para reduzir o tempo de venda e aumentar o interesse de compradores.",
    content:
      "Vender mais rápido exige combinação de preço correto, boas fotos e resposta ágil aos contatos. Comece revisando os dados do anúncio e destacando os diferenciais que realmente importam.\n\nInclua informações completas, mantenha o anúncio atualizado e responda mensagens no mesmo dia sempre que possível. Isso aumenta sua taxa de conversão.\n\nTambém vale investir em plano de destaque para gerar mais visualizações qualificadas e acelerar propostas.",
    cover_image_url: "",
    published: true,
    sort_order: 1,
  },
  {
    id: "blog-2",
    slug: "erros-que-fazem-seu-imovel-ficar-meses-parado-no-anuncio",
    title: "Erros que fazem seu imóvel ficar meses parado no anúncio",
    excerpt: "Saiba quais falhas afastam compradores e como corrigir rapidamente.",
    content:
      "Os erros mais comuns são preço acima do mercado, descrição incompleta, fotos ruins e demora para responder interessados.\n\nOutro ponto crítico é esconder custos importantes, como condomínio e IPTU. Transparência aumenta confiança e evita perda de tempo.\n\nRevise seu anúncio com frequência e ajuste os pontos que estão travando o interesse.",
    cover_image_url: "",
    published: true,
    sort_order: 2,
  },
  {
    id: "blog-3",
    slug: "fotos-que-vendem-como-preparar-seu-imovel-antes-de-anunciar",
    title: "Fotos que vendem: como preparar seu imóvel antes de anunciar",
    excerpt: "Organização, iluminação e enquadramento para destacar seu imóvel nas buscas.",
    content:
      "Antes de fotografar, organize os ambientes, abra cortinas e retire itens pessoais em excesso. Ambientes claros e limpos passam sensação de cuidado.\n\nPriorize fotos horizontais, mostre pontos fortes e evite filtros pesados. Inclua cozinha, banheiros, quartos e fachada.\n\nQuanto melhor a apresentação visual, maior a chance de clique e contato.",
    cover_image_url: "",
    published: true,
    sort_order: 3,
  },
  {
    id: "blog-4",
    slug: "preco-certo-do-imovel-como-avaliar-sem-perder-dinheiro",
    title: "Preço certo do imóvel: como avaliar sem perder dinheiro",
    excerpt: "Estratégias para precificar de forma competitiva sem desvalorizar seu patrimônio.",
    content:
      "Definir preço exige comparar imóveis similares da mesma região, padrão e metragem. Avalie também estado de conservação e diferenciais como vaga e lazer.\n\nPreço muito alto reduz contatos; muito baixo pode gerar perda financeira. Faça ajustes graduais conforme a resposta do mercado.\n\nCom uma faixa de preço realista, você aumenta a chance de negociação saudável.",
    cover_image_url: "",
    published: true,
    sort_order: 4,
  },
  {
    id: "blog-5",
    slug: "apartamento-ou-casa-o-que-os-compradores-mais-procuram-hoje",
    title: "Apartamento ou casa: o que os compradores mais procuram hoje?",
    excerpt: "Entenda tendências atuais de busca para posicionar melhor seu anúncio.",
    content:
      "A escolha entre casa e apartamento depende de perfil: famílias costumam buscar espaço, enquanto muitos compradores priorizam segurança e praticidade.\n\nLocalização, mobilidade e custo mensal continuam decisivos. Em apartamentos, áreas comuns e condomínio pesam bastante.\n\nDestaque no anúncio exatamente o que o público procura para o seu tipo de imóvel.",
    cover_image_url: "",
    published: true,
    sort_order: 5,
  },
  {
    id: "blog-6",
    slug: "checklist-completo-para-anunciar-um-imovel-sem-esquecer-nada",
    title: "Checklist completo para anunciar um imóvel sem esquecer nada",
    excerpt: "Um roteiro simples para publicar com qualidade e evitar retrabalho.",
    content:
      "Antes de publicar, confirme fotos de qualidade, descrição clara, endereço correto, valores completos e características do imóvel.\n\nInclua detalhes como quartos, banheiros, vagas, metragem, condomínio e IPTU quando aplicável.\n\nCom um checklist, seu anúncio fica mais profissional e gera contatos mais qualificados.",
    cover_image_url: "",
    published: true,
    sort_order: 6,
  },
  {
    id: "blog-7",
    slug: "como-destacar-seu-anuncio-e-atrair-mais-contatos-reais",
    title: "Como destacar seu anúncio e atrair mais contatos reais",
    excerpt: "Veja como aumentar visibilidade e receber mensagens de compradores com perfil certo.",
    content:
      "Para destacar o anúncio, use título objetivo, fotos fortes e informações completas. Isso melhora cliques e retenção.\n\nPlanos com destaque ajudam a ganhar posição na vitrine e aumentam alcance entre quem está buscando agora.\n\nA combinação entre boa apresentação e resposta rápida é o caminho para mais contatos reais.",
    cover_image_url: "",
    published: true,
    sort_order: 7,
  },
];

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function loadBlogPosts(includeUnpublished = false): Promise<BlogPost[]> {
  let query = supabase
    .from("blog_posts")
    .select("id,slug,title,excerpt,content,cover_image_url,published,sort_order,updated_at")
    .order("sort_order", { ascending: true });

  if (!includeUnpublished) {
    query = query.eq("published", true);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return includeUnpublished
      ? DEFAULT_BLOG_POSTS
      : DEFAULT_BLOG_POSTS.filter((post) => post.published);
  }

  return data as BlogPost[];
}

export async function saveBlogPost(post: BlogPost) {
  const { error } = await supabase.from("blog_posts").upsert(
    {
      ...post,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

export async function deleteBlogPost(id: string) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}

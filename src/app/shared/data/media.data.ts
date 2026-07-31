export interface MediaItem {
  id: number;
  title: string;
  type: 'movie' | 'series';
  year: number;
  rating: number;
  poster: string;
  backdrop?: string;
  overview: string;
  genres: string[];
}

export const MEDIA_DATA: MediaItem[] = [
  {
    id: 1,
    title: 'Interestelar',
    type: 'movie',
    year: 2014,
    rating: 9.8,
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6fRM9yF0oXnA8.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/pbrkL804c8EgLf6O0OPf0Svu5wq.jpg',
    overview:
      'Uma equipe de exploradores viaja através de um buraco de minhoca no espaço na tentativa de garantir a sobrevivência da humanidade.',
    genres: ['Ficção', 'Drama', 'Aventura'],
  },
  {
    id: 2,
    title: 'O Poderoso Chefão',
    type: 'movie',
    year: 1972,
    rating: 9.2,
    poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58wruusud2wj2qnfh7ta8.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/tmK36DZ0lrE6cUrtoeAGy0cJpp.jpg',
    overview:
      'O patriarca de uma dinastia do crime organiza a transferência de seu império clandestino para seu filho relutante.',
    genres: ['Crime', 'Drama'],
  },
  {
    id: 3,
    title: 'Pulp Fiction',
    type: 'movie',
    year: 1994,
    rating: 8.9,
    poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5sULI9YjBkYuAQ2fcQ3f.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/suaEOo1m6v3z7Gfh8f3e2cZp.jpg',
    overview:
      'As vidas de dois assassinos da máfia, um boxeador, um gângster e sua esposa se entrelaçam em quatro histórias de violência e redenção.',
    genres: ['Crime', 'Suspense'],
  },
  {
    id: 4,
    title: 'Inception',
    type: 'movie',
    year: 2010,
    rating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/9gk7ad6e2gh34kl2t0t7t6t6n6b.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/s3TBrUV0IPbjp4lj6xh3u30f3u0.jpg',
    overview:
      'Um ladrão que rouba segredos corporativos através do uso da tecnologia de compartilhamento de sonhos recebe a tarefa inversa de plantar uma ideia.',
    genres: ['Ação', 'Ficção', 'Suspense'],
  },
  {
    id: 5,
    title: 'Breaking Bad',
    type: 'series',
    year: 2008,
    rating: 9.5,
    poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L6I6n8TI2LFWU8G.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/tS3BlV0IPbjp4lj6xh3u30f3u0.jpg',
    overview:
      'Um professor de química do ensino médio diagnosticado com câncer recorre à fabricação e venda de metanfetamina para garantir o futuro de sua família.',
    genres: ['Crime', 'Drama', 'Suspense'],
  },
  {
    id: 6,
    title: 'Stranger Things',
    type: 'series',
    year: 2016,
    rating: 8.6,
    poster: 'https://image.tmdb.org/t/p/w49/rU7d6E3RWg7X8tMjz8Q7B7dB7Xa.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/56v2Kcf2hP2n8d2h6r2h6r2h6r2h6.jpg',
    overview:
      'Quando um garoto desaparece, uma pequena cidade descobre um caso extraordinário envolvendo experiências secretas, forças sobrenaturais e uma menina estranha.',
    genres: ['Mistério', 'Ficção', 'Drama'],
  },
  {
    id: 7,
    title: 'Game of Thrones',
    type: 'series',
    year: 2011,
    rating: 9.2,
    poster: 'https://image.tmdb.org/t/p/w500/u3bZgsG1Rt0f3u0f3u0f3u0f3u0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/2x7U0IPbjp4lj6xh3u30f3u0.jpg',
    overview:
      'Nobres famílias lutam pelo controle das terras de Westeros, enquanto um inimigo antigo retorna após séculos de ausência.',
    genres: ['Drama', 'Fantasia', 'Aventura'],
  },
  {
    id: 8,
    title: 'The Office',
    type: 'series',
    year: 2005,
    rating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/qWn4d7k1n7a3u0f3u0f3u0f3u0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/7DqN0IPbjp4lj6xh3u30f3u0.jpg',
    overview:
      'Um falso documentário sobre o cotidiano de funcionários de papelaria e seu insuportável chefe.',
    genres: ['Comédia'],
  },
  {
    id: 9,
    title: 'Clube da Luta',
    type: 'movie',
    year: 1999,
    rating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/pB8BM0LhV7TU8f3n6e3g3n6e3n6.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/52xH0IPbjp4lj6xh3u30f3u0.jpg',
    overview:
      'Um funcionário de escritório insone e um vendedor de sabão diabólico formam um clube de luta underground que evolui para muito mais.',
    genres: ['Drama', 'Suspense'],
  },
  {
    id: 10,
    title: 'Matrix',
    type: 'movie',
    year: 1999,
    rating: 8.7,
    poster: 'https://image.tmdb.org/t/p/w500/f89V3f3u0f3u0f3u0f3u0f3u0.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/fMM0IPbjp4lj6xh3u30f3u0.jpg',
    overview:
      'Um hacker descobre que a realidade é uma simulação criada por máquinas e se junta a uma rebelião para derrubar o sistema.',
    genres: ['Ação', 'Ficção'],
  },
  {
    id: 11,
    title: 'Chernobyl',
    type: 'series',
    year: 2019,
    rating: 9.4,
    poster: 'https://image.tmdb.org/t/p/w500/hlLZq2hP2n8d2h6r2h6r2h6r2h6.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nbr0IPbjp4lj6xh3u30f3u0.jpg',
    overview:
      'Em abril de 1986, uma explosão na usina nuclear de Chernobyl na União Soviética torna-se um dos piores desastres nucleares do mundo.',
    genres: ['Drama', 'História', 'Suspense'],
  },
  {
    id: 12,
    title: 'Parasita',
    type: 'movie',
    year: 2019,
    rating: 8.5,
    poster: 'https://image.tmdb.org/t/p/w500/7IiTg2hP2n8d2h6r2h6r2h6r2h6.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/TU0IPbjp4lj6xh3u30f3u0.jpg',
    overview:
      'A ganância e a discriminação de classes ameaçam o relacionamento simbiótico recém-formado entre a rica família Park e o clã Kim.',
    genres: ['Drama', 'Suspense', 'Comédia'],
  },
];

interface Props {
  params: Promise<{
    artist: string;
  }>;
}

export default async function ArtistsPage({ params }: Props) {
  const { artist } = await params;

  return <div></div>;
}

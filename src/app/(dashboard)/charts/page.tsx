import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ChartsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gráficos</h1>
        <p className="text-muted-foreground">
          Visualize suas medições em gráficos interativos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análise Visual</CardTitle>
          <CardDescription>
            Esta funcionalidade será implementada em breve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Em desenvolvimento...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

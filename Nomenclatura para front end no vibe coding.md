# Nomenclatura para Front End no Vibe Coding

Guia completo de componentes UI com nomes padronizados, descricoes e exemplos de codigo para uso com shadcn/ui e React.

---

## Navegacao e Estrutura

### Breadcrumb

Navegacao hierarquica que mostra o caminho atual do usuario.

```tsx
import { Breadcrumb } from "@/components/ui/breadcrumb"

export default function BreadcrumbDemo() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Pagina Atual</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

### Pagination

Navegacao entre paginas de conteudo.

```tsx
import { Pagination } from "@/components/ui/pagination"

export default function PaginationDemo() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
```

### Menu

Lista de itens ou acoes, geralmente em um catalogo ou barra lateral.

```tsx
import { Menu } from "@/components/ui/menu"

export default function MenuDemo() {
  return (
    <Menu>
      <MenuItem>Arquivo</MenuItem>
      <MenuItem>Recursos</MenuItem>
      <MenuItem>Novidades</MenuItem>
      <MenuSeparator />
      <MenuItem>Configuracoes</MenuItem>
      <MenuItem>Relatorios</MenuItem>
      <MenuItem>Sobre</MenuItem>
    </Menu>
  )
}
```

### Submenu

Menu aninhado que aparece ao interagir com um item de menu principal.

```tsx
import { Submenu } from "@/components/ui/submenu"

export default function SubmenuDemo() {
  return (
    <Menu>
      <MenuItem>Arquivo</MenuItem>
      <MenuItem>Recursos</MenuItem>
      <MenuItem>Novidades</MenuItem>
      <MenuSeparator />
      <MenuItem>Configuracoes</MenuItem>
      <MenuItem>Relatorios</MenuItem>
      <SubMenu>
        <MenuItem>Sobre</MenuItem>
      </SubMenu>
    </Menu>
  )
}
```

---

## Formularios e Entrada de Dados

### Form

Estrutura para coletar dados do usuario.

```tsx
// Para o codigo completo do formulario:
// 1. Crie o schema de validacao do formulario
// 2. Use useForm com o schema
// 3. Crie o <Form> com os campos necessarios
// 4. Adicione validacao e tratamento de submit

import { Form } from "@/components/ui/form"

export default function FormDemo() {
  return (
    <Form>
      <FormField>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="seu@email.com" />
        </FormControl>
      </FormField>
      <FormField>
        <FormLabel>Senha</FormLabel>
        <FormControl>
          <Input type="password" />
        </FormControl>
      </FormField>
      <Button type="submit">Enviar</Button>
    </Form>
  )
}
```

### Input

Campo de entrada de texto de uma linha.

```tsx
import { Input } from "@/components/ui/input"

export default function InputDemo() {
  return (
    <Input placeholder="Digite seu nome" />
  )
}
```

### Textarea

Campo de entrada de texto de multiplas linhas.

```tsx
import { Textarea } from "@/components/ui/textarea"

export default function TextareaDemo() {
  return (
    <Textarea placeholder="Digite sua mensagem" />
  )
}
```

### Select

Caixa de selecao com lista de opcoes.

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SelectDemo() {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="opcao1">Opcao 1</SelectItem>
        <SelectItem value="opcao2">Opcao 2</SelectItem>
        <SelectItem value="opcao3">Opcao 3</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

### Checkbox

Permite ao usuario selecionar uma ou mais opcoes.

```tsx
import { Checkbox } from "@/components/ui/checkbox"

export default function CheckboxDemo() {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="aceito" />
      <label htmlFor="aceito">Aceito os termos</label>
    </div>
  )
}
```

### Radio Button

Permite ao usuario selecionar uma unica opcao de uma lista.

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function RadioDemo() {
  return (
    <RadioGroup defaultValue="opcaoA">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="opcaoA" id="opcaoA" />
        <label htmlFor="opcaoA">Opcao A</label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="opcaoB" id="opcaoB" />
        <label htmlFor="opcaoB">Opcao B</label>
      </div>
    </RadioGroup>
  )
}
```

### Button

Elemento clicavel para disparar acoes.

Variantes: **Primario**, **Secundario**, **Contorno**, **Fantasma**

```tsx
import { Button } from "@/components/ui/button"

export default function ButtonDemo() {
  return (
    <div className="flex gap-2">
      <Button>Primario</Button>
      <Button variant="secondary">Secundario</Button>
      <Button variant="outline">Contorno</Button>
      <Button variant="ghost">Fantasma</Button>
    </div>
  )
}
```

### Label

Rotulo de texto associado a um campo de formulario.

```tsx
import { Label } from "@/components/ui/label"

export default function LabelDemo() {
  return (
    <div>
      <Label htmlFor="email">Email</Label>
      <Input id="email" placeholder="seu@email.com" />
    </div>
  )
}
```

---

## Feedback e Notificacoes

### Alert

Exibe mensagens importantes e comunicados.

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AlertDemo() {
  return (
    <Alert>
      <AlertTitle>Sucesso!</AlertTitle>
      <AlertDescription>
        Sua operacao foi realizada com sucesso.
      </AlertDescription>
    </Alert>
  )
}
```

### Toast

Notificacao nao intrusiva que aparece brevemente na tela.

```tsx
import { toast } from "sonner"

export default function ToastDemo() {
  return (
    <Button onClick={() => toast("Acao realizada com sucesso!")}>
      Mostrar Toast
    </Button>
  )
}
```

### Badge

Pequeno marcador para status, contagem ou categorias.

```tsx
import { Badge } from "@/components/ui/badge"

export default function BadgeDemo() {
  return (
    <div className="flex gap-2">
      <Badge>Padrao</Badge>
      <Badge variant="secondary">Secundario</Badge>
      <Badge variant="destructive">Destrutivo</Badge>
      <Badge variant="outline">Contorno</Badge>
    </div>
  )
}
```

### Loading Spinner

Animacao para indicar que um processo esta em andamento.

```tsx
import { Loader } from "lucide-react"

export default function LoadingDemo() {
  return (
    <Loader className="animate-spin" />
  )
}
```

### Progress Bar

Indica o progresso de uma tarefa.

```tsx
import { Progress } from "@/components/ui/progress"

export default function ProgressDemo() {
  return (
    <Progress value={60} />
  )
}
```

---

## Conteudo e Midia

### Avatar

Representacao visual de um usuario.

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AvatarDemo() {
  return (
    <Avatar>
      <AvatarImage src="https://example.com/avatar.jpg" alt="Usuario" />
      <AvatarFallback>US</AvatarFallback>
    </Avatar>
  )
}
```

### Gallery

Colecao de multiplas imagens em uma grade.

```tsx
export default function GalleryDemo() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <img src="/img1.jpg" alt="Imagem 1" className="rounded-lg" />
      <img src="/img2.jpg" alt="Imagem 2" className="rounded-lg" />
      <img src="/img3.jpg" alt="Imagem 3" className="rounded-lg" />
    </div>
  )
}
```

### Video Player

Componente para reproduzir e controlar videos.

```tsx
import ReactPlayer from "react-player"

export default function VideoPlayerDemo() {
  return (
    <ReactPlayer
      url="https://www.youtube.com/watch?v=example"
      controls
    />
  )
}
```

### Image

Componente para exibir imagens de forma responsiva.

```tsx
import Image from "next/image"

export default function ImageDemo() {
  return (
    <Image
      src="/imagem.jpg"
      alt="Descricao"
      width={800}
      height={600}
      className="rounded-lg"
    />
  )
}
```

---

## Secoes e Layout

### Hero

Secao de destaque no topo da pagina com titulo impactante.

```tsx
export default function HeroDemo() {
  return (
    <section className="flex flex-col items-center justify-center py-20">
      <h1 className="text-5xl font-bold">Titulo Impactante</h1>
      <p className="text-muted-foreground mt-4">Descricao do produto ou servico</p>
      <Button className="mt-8">Comecar Agora</Button>
    </section>
  )
}
```

### Card

Container para agrupar conteudo relacionado.

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CardDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Titulo do Card</CardTitle>
        <CardDescription>Descricao do card</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Conteudo do card aqui.</p>
      </CardContent>
    </Card>
  )
}
```

### Stats

Exibe dados estatisticos em formato destacado.

```tsx
export default function StatsDemo() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <p className="text-3xl font-bold">1.2K</p>
        <p className="text-muted-foreground">Usuarios</p>
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold">340</p>
        <p className="text-muted-foreground">Projetos</p>
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold">99%</p>
        <p className="text-muted-foreground">Satisfacao</p>
      </div>
    </div>
  )
}
```

### Tooltip

Pequena caixa de texto que aparece ao passar o mouse sobre um elemento.

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function TooltipDemo() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>Passe o mouse</TooltipTrigger>
        <TooltipContent>
          <p>Texto do tooltip</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

### Divider

Linha de separacao entre secoes de conteudo.

```tsx
import { Separator } from "@/components/ui/separator"

export default function DividerDemo() {
  return (
    <Separator />
  )
}
```

### Tabs

Permite alternar entre diferentes visualizacoes de conteudo.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TabsDemo() {
  return (
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Aba 1</TabsTrigger>
        <TabsTrigger value="tab2">Aba 2</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Conteudo da aba 1</TabsContent>
      <TabsContent value="tab2">Conteudo da aba 2</TabsContent>
    </Tabs>
  )
}
```

### CTA (Call-to-Action)

Botao de destaque para incentivar uma acao principal.

```tsx
import { Button } from "@/components/ui/button"

export default function CTADemo() {
  return (
    <Button size="lg" className="text-lg px-8">
      Comecar Agora
    </Button>
  )
}
```

---

## Utilitarios e Funcionalidades

### Search Bar

Campo de busca para pesquisar conteudo.

```tsx
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function SearchBarDemo() {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Pesquisar..." className="pl-10" />
    </div>
  )
}
```

### Filter

Conjunto de opcoes para filtrar listas de dados.

```tsx
import { Button } from "@/components/ui/button"

export default function FilterDemo() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm">Todos</Button>
      <Button variant="outline" size="sm">Ativos</Button>
      <Button variant="outline" size="sm">Inativos</Button>
    </div>
  )
}
```

---

## Componentes Avancados e de Interacao

### Slider

Permite selecionar um valor de um intervalo.

```tsx
import { Slider } from "@/components/ui/slider"

export default function SliderDemo() {
  return (
    <Slider defaultValue={[50]} max={100} step={1} />
  )
}
```

### Date Picker

Permite selecionar uma data de um calendario.

```tsx
import { Calendar } from "@/components/ui/calendar"

export default function DatePickerDemo() {
  return (
    <Calendar mode="single" />
  )
}
```

### File Upload

Permite ao usuario enviar arquivos.

```tsx
import { Input } from "@/components/ui/input"

export default function FileUploadDemo() {
  return (
    <div>
      <label>Foto de Perfil</label>
      <Input type="file" accept="image/*" />
      <p className="text-sm text-muted-foreground">
        Arquivos aceitos: Nenhum arquivo escolhido
      </p>
    </div>
  )
}
```

### Social Share Buttons

Botoes para compartilhar conteudo em redes sociais.

```tsx
import { Button } from "@/components/ui/button"

export default function SocialShareDemo() {
  return (
    <div className="flex gap-2">
      <Button variant="outline">Facebook</Button>
      <Button variant="outline">Twitter</Button>
      <Button variant="outline">LinkedIn</Button>
    </div>
  )
}
```

### Audio Player

Componente para reproduzir e controlar audios.

```tsx
export default function AudioPlayerDemo() {
  return (
    <audio controls>
      <source src="/audio.mp3" type="audio/mpeg" />
    </audio>
  )
}
```

### Map

Exibe um mapa interativo.

```tsx
export default function MapDemo() {
  return (
    <iframe
      src="https://maps.google.com/maps?q=..."
      className="w-full h-64 rounded-lg"
      loading="lazy"
    />
  )
}
```

### Chart

Exibe dados em formato de grafico.

```tsx
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

export default function ChartDemo() {
  const data = [
    { name: "Jan", value: 400 },
    { name: "Fev", value: 300 },
    { name: "Mar", value: 600 },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Bar dataKey="value" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Tag Input

Campo de entrada para adicionar multiplas tags.

```tsx
export default function TagInputDemo() {
  return (
    <div className="flex flex-wrap gap-2 border rounded-lg p-2">
      <Badge>React</Badge>
      <Badge>Next.js</Badge>
      <Input placeholder="Adicionar tag..." className="border-0 flex-1" />
    </div>
  )
}
```

### Switch

Controle de alternancia entre dois estados (ligado/desligado).

```tsx
import { Switch } from "@/components/ui/switch"

export default function SwitchDemo() {
  return (
    <div className="flex items-center space-x-2">
      <Switch id="modo-auto" />
      <label htmlFor="modo-auto">Modo Auto</label>
    </div>
  )
}
```

### Skeleton

Placeholder visual para indicar carregamento de conteudo.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function SkeletonDemo() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[150px]" />
    </div>
  )
}
```

---

## Componentes Adicionais (shadcn/ui)

### Alert Dialog

Dialogo modal para confirmacao ou alertas criticos.

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export default function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <Button variant="destructive">Excluir</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acao nao pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Aspect Ratio

Mantem a proporcao de um elemento (ex: imagens, videos).

```tsx
import { AspectRatio } from "@/components/ui/aspect-ratio"

export default function AspectRatioDemo() {
  return (
    <AspectRatio ratio={16 / 9}>
      <img src="/imagem.jpg" alt="Imagem" className="rounded-lg object-cover w-full h-full" />
    </AspectRatio>
  )
}
```

### Collapsible

Conteudo expansivel e retratil.

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function CollapsibleDemo() {
  return (
    <Collapsible>
      <CollapsibleTrigger>
        <Button variant="ghost">@peduarte/radix-ui</Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p>Conteudo expandido aqui.</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

### Command

Caixa de comando/pesquisa com atalhos.

```tsx
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

export default function CommandDemo() {
  return (
    <Command>
      <CommandInput placeholder="Digite um comando..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Sugestoes">
          <CommandItem>Calendario</CommandItem>
          <CommandItem>Configuracoes</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
```

### Context Menu

Menu que aparece ao clicar com botao direito.

```tsx
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"

export default function ContextMenuDemo() {
  return (
    <ContextMenu>
      <ContextMenuTrigger>Clique com botao direito aqui</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Copiar</ContextMenuItem>
        <ContextMenuItem>Colar</ContextMenuItem>
        <ContextMenuItem>Excluir</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
```

### Drawer

Painel lateral deslizante.

```tsx
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"

export default function DrawerDemo() {
  return (
    <Drawer>
      <DrawerTrigger>
        <Button>Abrir Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Titulo</DrawerTitle>
          <DrawerDescription>Descricao do drawer.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Salvar</Button>
          <DrawerClose>
            <Button variant="outline">Cancelar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
```

### Hover Card

Card que aparece ao passar o mouse sobre um elemento.

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

export default function HoverCardDemo() {
  return (
    <HoverCard>
      <HoverCardTrigger>Passe o mouse</HoverCardTrigger>
      <HoverCardContent>
        <p>Informacoes adicionais exibidas no hover.</p>
      </HoverCardContent>
    </HoverCard>
  )
}
```

### Input OTP

Campo para entrada de codigo OTP (One-Time Password).

```tsx
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

export default function InputOTPDemo() {
  return (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  )
}
```

### Menubar

Barra de menu horizontal com submenus.

```tsx
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar"

export default function MenubarDemo() {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Arquivo</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Novo</MenubarItem>
          <MenubarItem>Abrir</MenubarItem>
          <MenubarItem>Salvar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}
```

### Scroll Area

Area com scroll customizado.

```tsx
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ScrollAreaDemo() {
  return (
    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
      <div>
        <p>Item 1</p>
        <p>Item 2</p>
        <p>Item 3</p>
        {/* ... mais itens */}
      </div>
    </ScrollArea>
  )
}
```

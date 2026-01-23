export function Footer() {
    return (
        <footer className="border-t bg-muted/40 py-12">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row md:py-0">
                <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        &copy; {new Date().getFullYear()} PayFlow. Todos os direitos reservados.
                    </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <a href="#" className="hover:underline">Termos</a>
                    <a href="#" className="hover:underline">Privacidade</a>
                    <a href="#" className="hover:underline">Suporte</a>
                </div>
            </div>
        </footer>
    );
}

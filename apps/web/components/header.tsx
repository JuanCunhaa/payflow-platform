import Link from "next/link";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                    <span className="text-xl font-bold text-primary">PayFlow</span>
                </Link>
                <nav className="flex items-center space-x-4">
                    <ModeToggle />
                    <Link href="/login">
                        <Button variant="ghost">Entrar</Button>
                    </Link>
                    <Link href="/register">
                        <Button>Começar Agora</Button>
                    </Link>
                </nav>
            </div>
        </header>
    );
}

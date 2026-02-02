'use client';

import { useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { Loader2 } from 'lucide-react';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type GuardianStudent = {
  id: string;
  name: string;
  status: string;
  class: {
    id: string;
    name: string;
  };
};

type StudentsResponse = {
  items: GuardianStudent[];
};

export default function GuardianStudentsPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [students, setStudents] = useState<GuardianStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/guardian/students');
        if (!res.ok) {
          setError(t(i18nKeys.common.error));
          return;
        }

        const data = (await res.json()) as StudentsResponse;
        if (!cancelled) {
          setStudents(data.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setError(t(i18nKeys.common.error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, t]);

  if (loading) {
    return (
      <div className="flex justify-center p-8 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="flex justify-center p-8 text-destructive">{error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t(i18nKeys.guardian.pages.students.title)}
        </h1>
        <p className="text-muted-foreground">{t(i18nKeys.guardian.pages.students.description)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alunos Vinculados</CardTitle>
          <CardDescription>Lista de alunos sob sua responsabilidade.</CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              {t(i18nKeys.school.studentsUi.empty)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(i18nKeys.school.studentsUi.table.name)}</TableHead>
                  <TableHead>{t(i18nKeys.school.studentsUi.table.class)}</TableHead>
                  <TableHead>{t(i18nKeys.school.studentsUi.table.status)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.class.name}</TableCell>
                    <TableCell>
                      {student.status === 'ACTIVE' ? (
                        <Badge variant="success">
                          {t(i18nKeys.school.studentsUi.status.active)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t(i18nKeys.school.studentsUi.status.inactive)}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

using Xunit;

// Empêche l'exécution concurrente inter-classes sur la base de données PostgreSQL Staging partagée
[assembly: CollectionBehavior(DisableTestParallelization = true)]

# ==============================================================================
# Dockerfile - Archiveo .NET 9 Backend
# Multi-stage build for optimized production image
# ==============================================================================

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files for layer caching
COPY ["Archiveo.sln", "./"]
COPY ["Archiveo.Domain/Archiveo.Domain.csproj", "Archiveo.Domain/"]
COPY ["Archiveo.Application/Archiveo.Application.csproj", "Archiveo.Application/"]
COPY ["Archiveo.Infrastructure/Archiveo.Infrastructure.csproj", "Archiveo.Infrastructure/"]
COPY ["Archiveo.Api/Archiveo.Api.csproj", "Archiveo.Api/"]
COPY ["Archiveo.Tests/Archiveo.Tests.csproj", "Archiveo.Tests/"]

RUN dotnet restore "Archiveo.sln"

# Copy all source files and publish
COPY . .
WORKDIR "/src/Archiveo.Api"
RUN dotnet publish "Archiveo.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Create upload directories
RUN mkdir -p /app/uploads/documents /app/uploads/signatures

COPY --from=build /app/publish .

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Archiveo.Api.dll"]

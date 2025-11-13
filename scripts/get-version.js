/**
 * Script para obtener la versión del último commit de Git
 * Genera un archivo con la información de versión
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

try {
  // Obtener el hash del último commit
  const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  
  // Obtener la fecha del último commit
  const commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf-8' }).trim();
  
  // Obtener el mensaje del último commit (primeras 50 caracteres)
  const commitMessage = execSync('git log -1 --format=%s', { encoding: 'utf-8' }).trim();
  
  const versionInfo = {
    commitHash,
    commitDate,
    commitMessage,
    buildDate: new Date().toISOString(),
  };
  
  // Escribir el archivo de versión
  const versionPath = resolve(process.cwd(), 'src/version.json');
  writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2), 'utf-8');
  
  console.log('✅ Versión generada:', commitHash);
  console.log('   Fecha:', commitDate);
  console.log('   Mensaje:', commitMessage);
} catch (error) {
  console.error('❌ Error obteniendo versión:', error.message);
  // Crear versión por defecto si no hay git
  const versionInfo = {
    commitHash: 'unknown',
    commitDate: new Date().toISOString(),
    commitMessage: 'No git repository',
    buildDate: new Date().toISOString(),
  };
  
  const versionPath = resolve(process.cwd(), 'src/version.json');
  writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2), 'utf-8');
  console.log('⚠️ Versión por defecto creada (sin git)');
}


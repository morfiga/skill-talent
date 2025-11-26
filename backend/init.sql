-- Script de inicialização do banco de dados Skill Talent
-- Este script é executado automaticamente quando o container MySQL é criado pela primeira vez

-- Garantir que o banco existe (já criado pelo MYSQL_DATABASE)
USE skill_talent;

-- Configurar charset e collation
ALTER DATABASE skill_talent CHARACTER SET utf8mb4;

-- ============================================
-- TABELAS BÁSICAS
-- ============================================

-- Criar tabela de usuários (se não existir)
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `picture` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`),
  KEY `idx_email` (`email`),
  KEY `idx_google_id` (`google_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de colaboradores
CREATE TABLE `colaboradores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `cargo` varchar(255) DEFAULT NULL,
  `departamento` varchar(255) DEFAULT NULL,
  `avatar` varchar(10) DEFAULT NULL,
  `nivel_carreira` varchar(10) DEFAULT NULL,
  `gestor_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_gestor` (`gestor_id`),
  CONSTRAINT `fk_colaboradores_gestor` FOREIGN KEY (`gestor_id`) REFERENCES `colaboradores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELAS DE AVALIAÇÃO
-- ============================================

-- Criar tabela de eixos de avaliação
CREATE TABLE `eixos_avaliacao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nome` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de níveis de eixo
CREATE TABLE `niveis_eixo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eixo_id` int NOT NULL,
  `nivel` int NOT NULL,
  `descricao` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_eixo_nivel` (`eixo_id`,`nivel`),
  CONSTRAINT `fk_niveis_eixo_eixo_avaliacao` FOREIGN KEY (`eixo_id`) REFERENCES `eixos_avaliacao` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de ciclos
CREATE TABLE `ciclos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `status` enum('aberto','em_andamento','concluido','fechado') NOT NULL DEFAULT 'aberto',
  `data_inicio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_fim` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_data_inicio` (`data_inicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de ciclos de avaliação
CREATE TABLE `ciclos_avaliacao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ciclo_id` int NOT NULL,
  `colaborador_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_colaborador` (`colaborador_id`),
  KEY `idx_ciclo_id` (`ciclo_id`),
  CONSTRAINT `fk_ciclos_avaliacao_colaborador` FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ciclos_avaliacao_ciclo` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de pares selecionados
CREATE TABLE `pares_selecionados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ciclo_avaliacao_id` int NOT NULL,
  `par_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ciclo_avaliacao_par` (`ciclo_avaliacao_id`,`par_id`),
  KEY `idx_par` (`par_id`),
  KEY `idx_ciclo_avaliacao_id` (`ciclo_avaliacao_id`),
  CONSTRAINT `fk_pares_selecionados_ciclo_avaliacao` FOREIGN KEY (`ciclo_avaliacao_id`) REFERENCES `ciclos_avaliacao` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pares_selecionados_colaborador` FOREIGN KEY (`par_id`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de avaliações
CREATE TABLE `avaliacoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ciclo_id` int NOT NULL,
  `ciclo_avaliacao_id` int DEFAULT NULL,
  `avaliador_id` int NOT NULL,
  `avaliado_id` int NOT NULL,
  `tipo` enum('autoavaliacao','par','gestor') NOT NULL,
  `avaliacao_geral` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ciclo_avaliador_avaliado_tipo` (`avaliador_id`,`avaliado_id`,`tipo`),
  KEY `idx_avaliador` (`avaliador_id`),
  KEY `idx_avaliado` (`avaliado_id`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_ciclo_id_new` (`ciclo_id`),
  KEY `fk_avaliacoes_ciclos_avaliacao` (`ciclo_avaliacao_id`),
  CONSTRAINT `fk_avaliacoes_colaborador_avaliador` FOREIGN KEY (`avaliador_id`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_avaliacoes_colaborador_avaliado` FOREIGN KEY (`avaliado_id`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_avaliacoes_ciclo` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_avaliacoes_ciclos_avaliacao` FOREIGN KEY (`ciclo_avaliacao_id`) REFERENCES `ciclos_avaliacao` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de avaliações por eixo
CREATE TABLE `avaliacoes_eixos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `avaliacao_id` int NOT NULL,
  `eixo_id` int NOT NULL,
  `nivel` int NOT NULL,
  `justificativa` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_avaliacao_eixo` (`avaliacao_id`,`eixo_id`),
  KEY `idx_avaliacao` (`avaliacao_id`),
  KEY `idx_eixo` (`eixo_id`),
  CONSTRAINT `fk_avaliacoes_eixos_avaliacao` FOREIGN KEY (`avaliacao_id`) REFERENCES `avaliacoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_avaliacoes_eixos_eixo_avaliacao` FOREIGN KEY (`eixo_id`) REFERENCES `eixos_avaliacao` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELAS DE ENTREGAS E VALORES
-- ============================================

-- Criar tabela de entregas outstanding
CREATE TABLE `entregas_outstanding` (
  `id` int NOT NULL AUTO_INCREMENT,
  `colaborador_id` int NOT NULL,
  `descricao` text NOT NULL,
  `impacto` text NOT NULL,
  `evidencias` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_colaborador` (`colaborador_id`),
  CONSTRAINT `fk_entregas_outstanding_colaborador` FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de valores
CREATE TABLE `valores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `icone` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de registros de valor
CREATE TABLE `registros_valor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `colaborador_id` int NOT NULL,
  `descricao` text NOT NULL,
  `reflexao` text NOT NULL,
  `impacto` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_colaborador` (`colaborador_id`),
  CONSTRAINT `fk_registros_valor_colaborador` FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar tabela de associação muitos-para-muitos entre registros e valores
CREATE TABLE `registro_valor_association` (
  `registro_id` int NOT NULL,
  `valor_id` int NOT NULL,
  PRIMARY KEY (`registro_id`,`valor_id`),
  KEY `valor_id` (`valor_id`),
  CONSTRAINT `fk_registro_valor_association_registro` FOREIGN KEY (`registro_id`) REFERENCES `registros_valor` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registro_valor_association_valor` FOREIGN KEY (`valor_id`) REFERENCES `valores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Inserir eixos de avaliação
INSERT IGNORE INTO eixos_avaliacao (codigo, nome) VALUES
('desenvolvimento-continuo', 'Desenvolvimento contínuo'),
('colaboracao', 'Colaboração'),
('operacao-processos', 'Operação e processos'),
('influencia', 'Influência');

-- Inserir níveis do eixo "Desenvolvimento contínuo"
INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 1, 'Se desenvolve com autonomia de acordo com o direcionamento do time'
FROM eixos_avaliacao WHERE codigo = 'desenvolvimento-continuo';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 2, 'É referência para alguns assuntos e assume a responsabilidade para aprender outros'
FROM eixos_avaliacao WHERE codigo = 'desenvolvimento-continuo';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 3, 'É auto consciente para identificar suas oportunidades de desenvolvimento com autonomia'
FROM eixos_avaliacao WHERE codigo = 'desenvolvimento-continuo';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 4, 'Questiona, pesquisa, define hipóteses e introduz pontos de desenvolvimento para os outros'
FROM eixos_avaliacao WHERE codigo = 'desenvolvimento-continuo';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 5, 'Define novos olhares e padrões de comportamento'
FROM eixos_avaliacao WHERE codigo = 'desenvolvimento-continuo';

-- Inserir níveis do eixo "Colaboração"
INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 1, 'Aprende rapidamente com colegas e consistentemente assume a responsabilidade quando necessário'
FROM eixos_avaliacao WHERE codigo = 'colaboracao';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 2, 'Pró ativamente direciona outras pessoas e dá os feeedbacks necessários'
FROM eixos_avaliacao WHERE codigo = 'colaboracao';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 3, 'Desenvolve outras pessoas para que acelerem suas carreiras e participem ativamente'
FROM eixos_avaliacao WHERE codigo = 'colaboracao';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 4, 'Coordena pessoas provocando mudanças e moderando discussões e conflitos'
FROM eixos_avaliacao WHERE codigo = 'colaboracao';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 5, 'Gerencia as carreiras, expectativas, desempenho e nível de satisfação dos membros da equipe'
FROM eixos_avaliacao WHERE codigo = 'colaboracao';

-- Inserir níveis do eixo "Operação e processos"
INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 1, 'Segue os processos pré-definidos, com um fluxo consistente de entregas'
FROM eixos_avaliacao WHERE codigo = 'operacao-processos';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 2, 'Reforça os processos existentes, garantindo que todos compreendam os benefícios e as compensações para o cliente'
FROM eixos_avaliacao WHERE codigo = 'operacao-processos';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 3, 'Ajusta os processos da equipe, trazendo o senso de urgência necessário, ouvindo o feedback e guiando a equipe nas mudanças'
FROM eixos_avaliacao WHERE codigo = 'operacao-processos';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 4, 'Desafia os processos existentes, e utiliza dados para melhorá-los ou criar novos'
FROM eixos_avaliacao WHERE codigo = 'operacao-processos';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 5, 'Define os processos adequados ao nível de maturidade da equipe, equilibrando agilidade e disciplina'
FROM eixos_avaliacao WHERE codigo = 'operacao-processos';

-- Inserir níveis do eixo "Influência"
INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 1, 'Tem impacto em um ou mais subsistemas'
FROM eixos_avaliacao WHERE codigo = 'influencia';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 2, 'Tem impacto em todo o time, não apenas parte dele'
FROM eixos_avaliacao WHERE codigo = 'influencia';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 3, 'Tem impacto em outros times para além do seu próprio'
FROM eixos_avaliacao WHERE codigo = 'influencia';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 4, 'Tem impacto em toda a organização'
FROM eixos_avaliacao WHERE codigo = 'influencia';

INSERT IGNORE INTO niveis_eixo (eixo_id, nivel, descricao) 
SELECT id, 5, 'Tem impacto para fora da organização'
FROM eixos_avaliacao WHERE codigo = 'influencia';

-- Inserir valores da organização
INSERT IGNORE INTO valores (codigo, nome, icone) VALUES
('donos-resultado', 'Donos do resultado', '🎯'),
('evoluimos-sempre', 'Evoluímos sempre', '📈'),
('jogo-equipe', 'Jogo em equipe', '🤝'),
('clareza-constroi', 'Clareza que constrói', '💡'),
('essencial-cliente', 'Essencial para o cliente', '❤️');

-- Mensagem de confirmação
SELECT 'Database skill_talent initialized successfully!' AS message;

import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/update";

export const messages = {
  "error.update.unsupported": "As atualizações estão disponíveis nas versões instaladas para computador.",
  "error.update.notReady": "Nenhuma atualização está pronta para instalar.",
  "error.update.restartFailed": "O MyBot não conseguiu reiniciar para instalar a atualização.",
  "error.update.downloadStalled": "O download da atualização parou de responder. Tente novamente.",
  "error.update.installFailed":
    "Não foi possível instalar a atualização. Encerre e abra o MyBot novamente, depois tente outra vez.",
  "error.update.downloadFailed": "Não foi possível baixar a atualização. Tente novamente.",
  "error.update.checkFailed": "Não foi possível verificar se há atualizações. Tente novamente.",
  "error.update.checkStalled": "A verificação de atualizações parou de responder. Tente novamente.",
  "error.update.checkOffline":
    "Não foi possível acessar o serviço de atualizações. Verifique sua conexão com a internet e tente novamente.",
  "error.update.checkUnavailable":
    "O serviço de atualizações não respondeu. O MyBot tentará novamente automaticamente em alguns minutos.",
  "error.update.checkNoRelease":
    "Nenhuma atualização publicada foi encontrada para esta plataforma. O MyBot tentará novamente automaticamente em alguns minutos.",
  "error.update.managedByNix": "O Nix instala as atualizações desta cópia do MyBot. Atualize-a com o Nix.",
  "error.update.managedByHost":
    "As atualizações neste Mac são instaladas pelo computador anfitrião. A atualização permanece pronta para instalação até a manutenção do computador anfitrião ser executada.",
  "error.update.siblingSession":
    "Outra sessão do MyBot ainda está em execução neste aplicativo. Encerre o MyBot em todas as outras contas de usuário do macOS e instale a atualização novamente.",
  "error.update.siblingSessionSameAccount":
    "Outro processo do MyBot ainda está rodando nesta conta de usuário. Feche-o e instale a atualização de novo.",
  "error.update.siblingCheckFailed":
    "Não foi possível verificar outras sessões do MyBot. Tente novamente antes de instalar.",
  "error.update.readOnlyLocation":
    "O MyBot não consegue instalar atualizações deste local. Encerre o MyBot. No Finder, arraste o MyBot para a pasta Aplicativos (se ele já estiver lá, arraste-o para fora e de volta). Depois, abra o MyBot e instale a atualização novamente.",
  "error.update.appImageMissing":
    "O MyBot não pode instalar a atualização porque o arquivo AppImage dele foi movido, renomeado ou substituído. Feche o MyBot e abra o arquivo AppImage novamente.",
  "error.update.appImageReadOnly":
    "O MyBot não pode instalar atualizações na pasta do arquivo AppImage dele. Feche o MyBot, mova o arquivo AppImage para uma pasta dentro da sua pasta pessoal, abra-o e instale a atualização novamente.",
  "error.update.remoteDisabled":
    "As atualizações feitas por administradores do servidor estão desativadas neste computador.",
  "error.update.restartStarted": "O MyBot já está reiniciando para instalar a atualização.",
  "error.update.alreadyRestarting": "O MyBot já está reiniciando.",
} as const satisfies PartialTranslation<typeof source>;
